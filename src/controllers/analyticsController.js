const Task = require('../models/Task');
const { cacheGet, cacheSet } = require('../config/redis');

exports.getTaskAnalytics = async (req, res) => {
  try {
    const cacheKey = `analytics:tasks:${req.user.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.status(200).json({ success: true, fromCache: true, data: cached });

    let filter = {};
    if (req.user.role === 'User') filter.assignedTo = req.user._id;
    else if (req.user.role === 'Manager') filter.team = req.user.team;

    const now = new Date();

    const [total, completed, pending, inProgress, overdue] = await Promise.all([
      Task.countDocuments(filter),
      Task.countDocuments({ ...filter, status: 'Completed' }),
      Task.countDocuments({ ...filter, status: 'Pending' }),
      Task.countDocuments({ ...filter, status: 'In Progress' }),
      Task.countDocuments({ ...filter, status: { $ne: 'Completed' }, dueDate: { $lt: now } }),
    ]);

    const data = { total, completed, pending, inProgress, overdue };
    await cacheSet(cacheKey, data, 120);

    res.status(200).json({ success: true, fromCache: false, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getUserAnalytics = async (req, res) => {
  try {
    const cacheKey = `analytics:users:${req.user.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.status(200).json({ success: true, fromCache: true, data: cached });

    let filter = {};
    if (req.user.role === 'Manager') filter.team = req.user.team;

    const now = new Date();
    const stats = await Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$status', 'Completed'] }, { $lt: ['$dueDate', now] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: '$user.username',
          email: '$user.email',
          team: '$user.team',
          total: 1,
          completed: 1,
          pending: 1,
          inProgress: 1,
          overdue: 1,
        },
      },
    ]);

    await cacheSet(cacheKey, stats, 120);
    res.status(200).json({ success: true, fromCache: false, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getTeamAnalytics = async (req, res) => {
  try {
    const cacheKey = `analytics:teams:admin`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.status(200).json({ success: true, fromCache: true, data: cached });

    const now = new Date();
    const stats = await Task.aggregate([
      {
        $group: {
          _id: '$team',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$status', 'Completed'] }, { $lt: ['$dueDate', now] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $project: { _id: 0, team: '$_id', total: 1, completed: 1, pending: 1, inProgress: 1, overdue: 1 } },
    ]);

    await cacheSet(cacheKey, stats, 120);
    res.status(200).json({ success: true, fromCache: false, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getMyAnalytics = async (req, res) => {
  try {
    const cacheKey = `analytics:me:${req.user.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.status(200).json({ success: true, fromCache: true, data: cached });

    // Filter restricted entirely to the requesting user's ID
    const filter = { assignedTo: req.user._id };
    const now = new Date();

    const [total, completed, pending, inProgress, overdue] = await Promise.all([
      Task.countDocuments(filter),
      Task.countDocuments({ ...filter, status: 'Completed' }),
      Task.countDocuments({ ...filter, status: 'Pending' }),
      Task.countDocuments({ ...filter, status: 'In Progress' }),
      Task.countDocuments({ ...filter, status: { $ne: 'Completed' }, dueDate: { $lt: now } }),
    ]);

    const data = { total, completed, pending, inProgress, overdue };
    await cacheSet(cacheKey, data, 120);

    res.status(200).json({ success: true, fromCache: false, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

