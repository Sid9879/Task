const Task = require('../models/Task');
const User = require('../models/User');
const { cacheGet, cacheSet, cacheDelPattern } = require('../config/redis');

const emitTaskEvent = (event, data) => {
  if (!global.io) return;

  global.io.to(data.team || 'Default').emit(event, data);

  global.io.to('admins').emit(event, data);
};


exports.createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority, status, assignedTo } = req.body;

   
    const assignee = await User.findById(assignedTo);
    if (!assignee) {
      return res.status(404).json({ success: false, error: 'Assigned user not found' });
    }

    
    if (req.user.role === 'Manager' && assignee.team !== req.user.team) {
      return res.status(403).json({
        success: false,
        error: 'Managers can only assign tasks to users within their team',
      });
    }

    
    if (req.user.role === 'User' && assignedTo !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Users can only create tasks assigned to themselves',
      });
    }

    const task = await Task.create({
      title,
      description,
      dueDate,
      priority,
      status,
      assignedTo,
      createdBy: req.user._id,
      team: assignee.team,
    });

    const populated = await task.populate([
      { path: 'assignedTo', select: 'username email team' },
      { path: 'createdBy', select: 'username email' },
    ]);

  
    await cacheDelPattern('tasks:*');

   
    emitTaskEvent('task_created', populated);

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getTasks = async (req, res) => {
  try {
    const {
      status,
      priority,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10,
      dueBefore,
      dueAfter,
    } = req.query;

   
    const cacheKey = `tasks:${req.user.id}:${JSON.stringify(req.query)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, fromCache: true, ...cached });
    }

   
    let filter = {};

    if (req.user.role === 'User') {
      filter.assignedTo = req.user._id;
    } else if (req.user.role === 'Manager') {
      filter.team = req.user.team;
    }
   

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    if (dueBefore || dueAfter) {
      filter.dueDate = {};
      if (dueBefore) filter.dueDate.$lte = new Date(dueBefore);
      if (dueAfter) filter.dueDate.$gte = new Date(dueAfter);
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const sortDir = order === 'asc' ? 1 : -1;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignedTo', 'username email team')
        .populate('createdBy', 'username email')
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limitNum),
      Task.countDocuments(filter),
    ]);

    const payload = {
      count: tasks.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: tasks,
    };

    await cacheSet(cacheKey, payload, 60); 

    res.status(200).json({ success: true, fromCache: false, ...payload });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'username email team')
      .populate('createdBy', 'username email');

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    
    if (
      req.user.role === 'User' &&
      task.assignedTo._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    
    if (req.user.role === 'Manager' && task.team !== req.user.team) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    
    if (
      req.user.role === 'User' &&
      task.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    if (req.user.role === 'Manager' && task.team !== req.user.team) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (req.body.assignedTo) {
      const newAssignee = await User.findById(req.body.assignedTo);
      if (!newAssignee) {
        return res.status(404).json({ success: false, error: 'Assigned user not found' });
      }
      if (req.user.role === 'Manager' && newAssignee.team !== req.user.team) {
        return res.status(403).json({
          success: false,
          error: 'Managers can only assign tasks to users within their team',
        });
      }
      req.body.team = newAssignee.team;
    }

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('assignedTo', 'username email team')
      .populate('createdBy', 'username email');


    await cacheDelPattern('tasks:*');

   
    emitTaskEvent('task_updated', task);

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    
    if (
      req.user.role !== 'Admin' &&
      task.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await task.deleteOne();

    await cacheDelPattern('tasks:*');
    emitTaskEvent('task_deleted', { _id: req.params.id, team: task.team });

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.assignTask = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    if (!assignedTo) {
      return res.status(400).json({ success: false, error: 'assignedTo is required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const assignee = await User.findById(assignedTo);
    if (!assignee) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    
    if (req.user.role === 'Manager') {
      if (task.team !== req.user.team) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      if (assignee.team !== req.user.team) {
        return res.status(403).json({
          success: false,
          error: 'Can only assign to users in your team',
        });
      }
    }

    task.assignedTo = assignedTo;
    task.team = assignee.team;
    await task.save();

    const populated = await task.populate([
      { path: 'assignedTo', select: 'username email team' },
      { path: 'createdBy', select: 'username email' },
    ]);

    await cacheDelPattern('tasks:*');
    emitTaskEvent('task_assigned', populated);

    res.status(200).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getMyTasks = async (req, res) => {
  try {
    const {
      status,
      priority,
      search,
      dueBefore,
      dueAfter,
      sortBy = 'dueDate',
      order = 'asc',
      page = 1,
      limit = 10,
    } = req.query;

    const cacheKey = `mytasks:${req.user.id}:${JSON.stringify(req.query)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, fromCache: true, ...cached });
    }

    const filter = { assignedTo: req.user._id };

    if (status)   filter.status   = status;
    if (priority) filter.priority = priority;

    if (dueBefore || dueAfter) {
      filter.dueDate = {};
      if (dueBefore) filter.dueDate.$lte = new Date(dueBefore);
      if (dueAfter)  filter.dueDate.$gte = new Date(dueAfter);
    }

    if (search) filter.$text = { $search: search };

    const pageNum  = parseInt(page,  10);
    const limitNum = parseInt(limit, 10);
    const skip     = (pageNum - 1) * limitNum;
    const sortDir  = order === 'desc' ? -1 : 1;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignedTo', 'username email team')
        .populate('createdBy', 'username email')
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limitNum),
      Task.countDocuments(filter),
    ]);

    const payload = {
      count: tasks.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: tasks,
    };

    await cacheSet(cacheKey, payload, 60);

    res.status(200).json({ success: true, fromCache: false, ...payload });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

