const express = require('express');
const {
  getTaskAnalytics,
  getUserAnalytics,
  getTeamAnalytics,
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Task analytics and statistics
 */

/**
 * @swagger
 * /api/analytics/tasks:
 *   get:
 *     summary: Get task statistics (count by status) for current user/team/all
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Task analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     inProgress:
 *                       type: integer
 *                     overdue:
 *                       type: integer
 */
router.get('/tasks', protect, getTaskAnalytics);

/**
 * @swagger
 * /api/analytics/users:
 *   get:
 *     summary: Get per-user task statistics (Admin/Manager only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Per-user analytics
 */
router.get('/users', protect, authorize('Admin', 'Manager'), getUserAnalytics);

/**
 * @swagger
 * /api/analytics/teams:
 *   get:
 *     summary: Get per-team task statistics (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Per-team analytics
 */
router.get('/teams', protect, authorize('Admin'), getTeamAnalytics);

module.exports = router;
