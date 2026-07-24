const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const { getTaskAnalytics, getUserAnalytics, getTeamAnalytics, getMyAnalytics } = require('../controllers/analyticsController');

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: System and performance analytics
 */

/**
 * @swagger
 * /api/analytics/me:
 *   get:
 *     summary: Get personal task analytics (for the logged-in user)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Personal task analytics data
 *       401:
 *         description: Unauthorized
 */
router.get('/me', protect, getMyAnalytics);

/**
 * @swagger
 * /api/analytics/tasks:
 *   get:
 *     summary: Get overall task analytics (completion rates, overdue stats)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Task analytics data
 *       403:
 *         description: Access denied
 */
router.get('/tasks', protect, authorize('Admin', 'Manager'), getTaskAnalytics);

/**
 * @swagger
 * /api/analytics/users:
 *   get:
 *     summary: Get user performance analytics (tasks completed vs overdue per user)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User performance metrics
 *       403:
 *         description: Access denied (Admin only)
 */
router.get('/users', protect, authorize('Admin'), getUserAnalytics);

/**
 * @swagger
 * /api/analytics/teams:
 *   get:
 *     summary: Get team performance analytics (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team performance metrics
 *       403:
 *         description: Access denied (Admin only)
 */
router.get('/teams', protect, authorize('Admin'), getTeamAnalytics);

module.exports = router;


