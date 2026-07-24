const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  logout,
  getMe,
  getUsers,
  updateUserRole,
  toggleUserStatus,
} = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/auth');
const { validateRegister, validateLogin } = require('../middlewares/validate');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 5,
  message: { success: false, error: 'Too many accounts created. Please try again later.' },
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User management and authentication
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string, example: johndoe }
 *               email: { type: string, format: email, example: john@example.com }
 *               password: { type: string, format: password, example: StrongPass123! }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', registerLimiter, validateRegister, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in with username or email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               email: { type: string, description: "Email OR Username", example: "admin@test.com" }
 *               username: { type: string, description: "Username OR Email", example: "adminuser" }
 *               password: { type: string, format: password, example: "Admin@1234" }
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginLimiter, validateLogin, login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out current user (blacklists token)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authorized
 */
router.post('/logout', protect, logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current logged-in user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Not authorized
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       403:
 *         description: Access denied
 */
router.get('/users', protect, authorize('Admin'), getUsers);

/**
 * @swagger
 * /api/auth/users/{id}/role:
 *   put:
 *     summary: Update a user's role and team (Admin only)
 *     tags: [Auth]
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
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [Admin, Manager, User] }
 *               team: { type: string, example: "Engineering" }
 *     responses:
 *       200:
 *         description: Role updated
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.put('/users/:id/role', protect, authorize('Admin'), updateUserRole);

/**
 * @swagger
 * /api/auth/users/{id}/status:
 *   put:
 *     summary: Activate or deactivate a user account (Admin only)
 *     tags: [Auth]
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
 *         description: User status toggled
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.put('/users/:id/status', protect, authorize('Admin'), toggleUserStatus);

module.exports = router;
