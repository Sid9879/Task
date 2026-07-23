# Task Management System API

A production-ready, comprehensive RESTful API built with **Node.js + Express**, featuring:
- ✅ JWT Authentication (Register, Login, Logout with token blacklisting)
- ✅ Role-Based Access Control (RBAC): **Admin**, **Manager**, **User**
- ✅ Full Task CRUD with assignment, filtering, search, and pagination
- ✅ Real-time updates via **Socket.io**
- ✅ Redis caching with cache invalidation
- ✅ Rate limiting (brute-force protection)
- ✅ Input validation with **Joi**
- ✅ OpenAPI 3.0 documentation via **Swagger UI** at `/api-docs`
- ✅ MongoDB with Mongoose (indexed for performance)
- ✅ Analytics endpoints (task/user/team statistics)

---

## 📁 Project Structure

```
src/
├── config/
│   ├── db.js           # MongoDB connection
│   └── redis.js        # Redis connection + helpers
├── controllers/
│   ├── authController.js
│   ├── taskController.js
│   └── analyticsController.js
├── middlewares/
│   ├── auth.js         # JWT verify + RBAC
│   └── validate.js     # Joi input validation
├── models/
│   ├── User.js
│   └── Task.js
├── routes/
│   ├── auth.js
│   ├── tasks.js
│   └── analytics.js
├── app.js              # Express app + Swagger setup
└── server.js           # HTTP server + Socket.io
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **MongoDB** running locally (default: `mongodb://127.0.0.1:27017`)
- **Redis** running locally (default: `redis://127.0.0.1:6379`) — *optional, graceful fallback*

### Installation

```bash
# 1. Clone / enter the project
cd task-manager

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and set your MONGO_URI, JWT_SECRET etc.

# 4. Start development server
npm run dev

# OR production
npm start
```

Server starts at: `http://localhost:5000`  
Swagger UI: `http://localhost:5000/api-docs`

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/task_manager` |
| `JWT_SECRET` | Secret key for JWT signing | *(required)* |
| `JWT_EXPIRES_IN` | JWT expiry duration | `1d` |
| `REDIS_HOST` | Redis host | `127.0.0.1` |
| `REDIS_PORT` | Redis port | `6379` |

---

## 📡 API Endpoints Overview

### Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and get JWT |
| POST | `/api/auth/logout` | Private | Logout (blacklist token) |
| GET | `/api/auth/me` | Private | Get own profile |
| GET | `/api/auth/users` | Admin | Get all users |
| PUT | `/api/auth/users/:id/role` | Admin | Update user role |
| PUT | `/api/auth/users/:id/status` | Admin | Toggle user active status |

### Tasks (`/api/tasks`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/tasks` | Private | Create a task |
| GET | `/api/tasks` | Private | Get tasks (filter/sort/paginate/search) |
| GET | `/api/tasks/assigned` | Private | Get tasks assigned to me |
| GET | `/api/tasks/:id` | Private | Get single task |
| PUT | `/api/tasks/:id` | Private | Update a task |
| DELETE | `/api/tasks/:id` | Private | Delete a task |
| PUT | `/api/tasks/:id/assign` | Admin/Manager | Assign task to user |

### Analytics (`/api/analytics`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/analytics/tasks` | Private | Task count by status |
| GET | `/api/analytics/users` | Admin/Manager | Per-user task stats |
| GET | `/api/analytics/teams` | Admin | Per-team task stats |

---

## 🔐 Role-Based Access Control

| Feature | User | Manager | Admin |
|---|---|---|---|
| View own profile | ✅ | ✅ | ✅ |
| Manage own tasks | ✅ | ✅ | ✅ |
| View team tasks | ❌ | ✅ | ✅ |
| Assign tasks (within team) | ❌ | ✅ | ✅ |
| Assign tasks (any user) | ❌ | ❌ | ✅ |
| View all users | ❌ | ❌ | ✅ |
| Update user roles | ❌ | ❌ | ✅ |
| View all task analytics | ❌ | ❌ | ✅ |
| View team analytics | ❌ | ✅ | ✅ |

---

## ⚡ Real-Time Events (Socket.io)

Connect to `ws://localhost:5000` and join a room with:
```js
socket.emit('join_team', 'Engineering');
```

Events emitted:
| Event | Description |
|---|---|
| `task_created` | New task created |
| `task_updated` | Task details changed |
| `task_deleted` | Task removed |
| `task_assigned` | Task reassigned to a user |

---

## 🗂️ Task Filtering & Search

```
GET /api/tasks?status=Pending&priority=High&search=backend&page=1&limit=10&sortBy=dueDate&order=asc&dueBefore=2025-12-31
```

---

## 📐 Design Decisions & Assumptions

1. **Password Policy**: Min 8 chars, must include uppercase, lowercase, digit, special character.
2. **JWT Logout**: Tokens are blacklisted in Redis with exact TTL matching token expiry.
3. **Redis Fallback**: If Redis is unavailable, the API continues without caching (graceful degradation).
4. **RBAC Enforcement**:
   - Users can only access/modify their own tasks.
   - Managers operate within their `team` scope.
   - Admins have global access.
5. **Task `team` Field**: Automatically inherited from the `assignedTo` user's team.
6. **Text Search**: MongoDB `$text` index on `title` and `description` for full-text search.
7. **Indexes**: Compound indexes on `status`, `priority`, `dueDate`, and `assignedTo` for query performance.

---

## 📖 API Documentation

Interactive Swagger UI: **http://localhost:5000/api-docs**  
Raw OpenAPI JSON: **http://localhost:5000/api-docs.json**
