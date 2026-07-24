const express = require('express');
const router = express.Router();

const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  assignTask,
  getMyTasks,
} = require('../controllers/taskController');
const { protect, authorize } = require('../middlewares/auth');
const { validateCreateTask, validateUpdateTask } = require('../middlewares/validate');

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management endpoints
 */

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks (filtered by role — Admin sees all, Manager sees team, User sees own)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, In Progress, Completed, Overdue]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [Low, Medium, High]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search on title and description
 *       - in: query
 *         name: dueBefore
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter tasks due before this date (e.g. 2027-01-01)
 *       - in: query
 *         name: dueAfter
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter tasks due after this date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of tasks
 *       401:
 *         description: Unauthorized
 *
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, dueDate, assignedTo]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Build REST API
 *               description:
 *                 type: string
 *                 example: Implement all CRUD endpoints
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2027-01-01T00:00:00Z"
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High]
 *                 default: Medium
 *               status:
 *                 type: string
 *                 enum: [Pending, In Progress, Completed, Overdue]
 *                 default: Pending
 *               assignedTo:
 *                 type: string
 *                 description: MongoDB ObjectId of the user to assign
 *                 example: "6a625c93c1ad94d6ccb74d08"
 *     responses:
 *       201:
 *         description: Task created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied (role restriction)
 */
router.route('/')
  .get(protect, authorize('Admin', 'Manager'), getTasks)
  .post(protect, validateCreateTask, createTask);

/**
 * @swagger
 * /api/tasks/assigned:
 *   get:
 *     summary: Get tasks assigned to the current logged-in user (with filters)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, In Progress, Completed, Overdue]
 *         description: Filter by task status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [Low, Medium, High]
 *         description: Filter by priority
 *       - in: query
 *         name: dueBefore
 *         schema:
 *           type: string
 *           format: date
 *         description: Tasks due before this date (e.g. 2027-06-01)
 *       - in: query
 *         name: dueAfter
 *         schema:
 *           type: string
 *           format: date
 *         description: Tasks due after this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search on title/description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: dueDate
 *         description: Field to sort by (dueDate, createdAt, priority)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated list of user's assigned tasks
 *       401:
 *         description: Unauthorized
 */
router.get('/assigned', protect, getMyTasks);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a single task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task found
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task not found
 *
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:       { type: string }
 *               description: { type: string }
 *               dueDate:     { type: string, format: date-time }
 *               priority:    { type: string, enum: [Low, Medium, High] }
 *               status:      { type: string, enum: [Pending, In Progress, Completed, Overdue] }
 *               assignedTo:  { type: string }
 *     responses:
 *       200:
 *         description: Task updated
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task not found
 *
 *   delete:
 *     summary: Delete a task (Admin or creator only)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task not found
 */
router.route('/:id')
  .get(protect, getTask)
  .put(protect, validateUpdateTask, updateTask)
  .delete(protect, deleteTask);

/**
 * @swagger
 * /api/tasks/{id}/assign:
 *   put:
 *     summary: Reassign a task to a different user (Admin or Manager only)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignedTo]
 *             properties:
 *               assignedTo:
 *                 type: string
 *                 description: MongoDB ObjectId of the new assignee
 *     responses:
 *       200:
 *         description: Task reassigned
 *       403:
 *         description: Access denied
 *       404:
 *         description: Task or user not found
 */
router.put('/:id/assign', protect, authorize('Admin', 'Manager'), assignTask);

module.exports = router;
