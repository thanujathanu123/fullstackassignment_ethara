# Team Task Manager

A production-ready full-stack team task manager built with React, Express, JWT authentication, and PostgreSQL on Supabase.

## Stack

- Frontend: React with functional components, hooks, Vite, Axios, React Router
- Backend: Node.js, Express.js, bcrypt, JSON Web Tokens, express-validator, Socket.IO
- Database: PostgreSQL hosted on Supabase
- Deployment: Railway monorepo with separate frontend and backend services

## Included Features

- JWT signup/login with bcrypt password hashes
- Project-level Admin and Member roles
- Project and member management
- Task creation, assignment, status updates, deadlines, and completion timestamps
- Smart overdue prediction with deterministic task risk scoring
- Activity logs for project, member, invite, and task changes
- Real-time updates through authenticated WebSockets
- Token-based project invite links with hashed tokens
- Analytics dashboard with productivity score, completion rate, on-time rate, risk counts, and project breakdowns

## Project Structure

```text
backend/
  server.js
  config/
  controllers/
  middleware/
  models/
  services/
  routes/
database/
  schema.sql
frontend/
  src/
    components/
    context/
    pages/
    services/
```

## Local Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor and run `database/schema.sql`.
3. Configure the backend:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Set these backend variables:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
PORT=5000
CLIENT_URL=http://localhost:3000
DB_SSL=true
```

4. Configure the frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Set this frontend variable:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Supabase Notes

Use the connection string from the Supabase project dashboard's Connect panel. Supabase recommends direct connections for persistent backend services when IPv6 is available, and the pooler session mode when IPv4 support is needed. The schema enables Row Level Security on public tables so Supabase Data API access is denied unless you intentionally add policies; this app is designed to access data through the Express API.

The schema includes `users`, `projects`, `project_members`, `tasks`, `project_invites`, and `activity_logs`.

## Roles and Permissions

- Admins can create projects, add or remove members, assign project roles, create tasks, assign tasks, and update task fields.
- Members can view only tasks assigned to them and can update only the status of those assigned tasks.
- Roles are scoped per project through `project_members.role`.

## API Documentation

All protected endpoints require:

```http
Authorization: Bearer <jwt>
```

### Auth

`POST /api/auth/signup`

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "password123"
}
```

`POST /api/auth/login`

```json
{
  "email": "ada@example.com",
  "password": "password123"
}
```

`GET /api/auth/me`

Returns the authenticated user.

### Projects

`GET /api/projects`

Returns projects where the authenticated user is a member.

`POST /api/projects`

```json
{
  "name": "Website Launch"
}
```

`GET /api/projects/:id/members`

Returns project members.

`POST /api/projects/:id/add-member`

```json
{
  "email": "member@example.com",
  "role": "member"
}
```

`DELETE /api/projects/:id/members/:userId`

Removes a member and clears their task assignments for that project.

`GET /api/projects/:id/activity`

Returns the project audit trail for project members.

`GET /api/projects/:id/invites`

Returns project invite records. Admin only.

`POST /api/projects/:id/invites`

Creates a one-time invite token and returns an invite URL. Admin only.

```json
{
  "email": "new-member@example.com",
  "role": "member",
  "expiresInDays": 7
}
```

`DELETE /api/projects/:id/invites/:inviteId`

Revokes a pending invite. Admin only.

### Tasks

`POST /api/tasks`

```json
{
  "title": "Create launch checklist",
  "description": "Prepare final launch steps",
  "assignedTo": "user-uuid",
  "projectId": "project-uuid",
  "status": "To Do",
  "deadline": "2026-05-30T18:00:00.000Z"
}
```

`GET /api/tasks/:projectId`

Admins receive all project tasks. Members receive assigned tasks only.
Each returned task includes `risk_score`, `risk_level`, and `risk_reason`.

`PUT /api/tasks/:taskId`

Members may send only:

```json
{
  "status": "In Progress"
}
```

Admins may update `title`, `description`, `assignedTo`, `status`, and `deadline`.

### Dashboard

`GET /api/dashboard`

Returns:

```json
{
  "stats": {
    "total_tasks": 8,
    "completed_tasks": 3,
    "pending_tasks": 5,
    "overdue_tasks": 1,
    "predicted_overdue_tasks": 2,
    "completion_rate": 38,
    "on_time_completion_rate": 67,
    "productivity_score": 72
  }
}
```

### Invites

`POST /api/invites/accept`

Accepts a project invite for the authenticated user. The invite email must match the authenticated user's email.

```json
{
  "token": "raw-invite-token-from-link"
}
```

### Analytics

`GET /api/analytics`

Returns `summary`, `by_project`, `status_breakdown`, `high_risk_tasks`, and `recent_activity`.

### Real-Time Events

Socket.IO runs on the backend service. Clients authenticate with the same JWT:

```js
io(API_ORIGIN, {
  auth: { token }
});
```

The frontend listens for `project:event`, `dashboard:update`, and `realtime:error`.

## Smart Overdue Prediction

The app uses a deterministic risk model, not AI. It scores open tasks from 0 to 100 based on deadline proximity, whether the task has started, elapsed schedule time, assignee open workload, and existing overdue workload. Risk levels are `low`, `medium`, `high`, and `overdue`.

## Railway Deployment

Deploy this repository as two Railway services from the same monorepo.

1. Push the repository to GitHub.
2. Create a Railway project.
3. Add a backend service from the repo and set Root Directory to `/backend`.
4. Add backend variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, and `DB_SSL=true`.
5. Deploy the backend and generate a public domain.
6. Add a frontend service from the same repo and set Root Directory to `/frontend`.
7. Add `REACT_APP_API_URL=https://your-backend-domain.railway.app/api`. The WebSocket client derives its Socket.IO origin from this same value.
8. Deploy the frontend and generate a public domain.
9. Update backend `CLIENT_URL` to the frontend domain, then redeploy the backend.

The included `railway.toml` files set build and start commands for both services. Railway frontend variables are injected at build time, so redeploy the frontend after changing `REACT_APP_API_URL`.

## Production Checklist

- Use a long random `JWT_SECRET`.
- Keep `DATABASE_URL` only on the backend service.
- Do not put Supabase service role or database credentials in the frontend.
- Keep `CLIENT_URL` restricted to the deployed frontend domain in production.
- Review Supabase RLS policies before exposing any direct Supabase client access.
- Run migrations in Supabase before deploying the backend.

## Documentation References

- [Supabase Postgres connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Railway monorepo guide](https://docs.railway.com/guides/monorepo)
- [Railway frontend environment variables](https://docs.railway.com/guides/frontend-environment-variables)
- [Railway static hosting guide](https://docs.railway.com/guides/static-hosting)
