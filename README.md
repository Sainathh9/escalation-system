<div align="center">

# IncidentFlow

### Enterprise Incident Escalation & Operations Management System

*Built with Node.js, React, PostgreSQL, Redis & Socket.IO*

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)

</div>

---

## What is IncidentFlow?

IncidentFlow is a **full-stack incident management platform** engineered for IT operations teams (NOC/SOC). It handles the complete lifecycle of a production incident — from creation and triage, through automatic SLA-based escalation, to real-time resolution tracking — across three distinct role-based portals.

The project was built to deeply understand the engineering patterns behind systems like ServiceNow and PagerDuty: **distributed job queues, real-time WebSocket rooms, role-scoped REST APIs, and automated compliance audit trails.**

---

## Engineering Highlights

### ⏱️ Automated SLA Escalation Engine
The most technically challenging piece. When a ticket is created, a **BullMQ job** is scheduled in Redis with a precise delay matching the ticket's severity (Critical → 1hr, High → 4hrs, etc.). If the ticket isn't resolved before the deadline, the worker fires automatically, escalates the ticket to the next level, recalculates a tighter SLA deadline, schedules the *next* escalation job, and emits a Socket.IO event — all without any polling or cron jobs.

```
Ticket Created
    │
    ▼
BullMQ Job scheduled (delay = SLA window)
    │
    ▼ (on breach)
SLA Worker fires ──► Escalation Level++ ──► New tighter SLA deadline
                 ──► Audit log written
                 ──► Socket.IO event emitted (ticket:escalated)
                 ──► Admin notified (in-app)
                 ──► Next BullMQ job scheduled (if level < 3)
```

### ⚡ Real-Time Multi-Room WebSocket Architecture
Socket.IO is configured with **room-based subscriptions** rather than broadcasting to all clients. Ticket detail pages join a room for their specific ticket ID. Role dashboards subscribe to their role room (`Admin`, `Technician`). This means a technician resolving a ticket triggers a live update only for users viewing that ticket — not a global broadcast that would thrash every connected client.

### 🛡️ Role-Scoped REST API with JWT Middleware
Every API route is protected by a two-layer middleware chain: `authMiddleware` (validates JWT, injects `req.user`) followed by `allowRoles([...])` (checks role against an allowlist). The result is clean, declarative route-level authorization with zero business logic leaking into controllers.

### 🐳 Containerized One-Command Deployment
The full stack (PostgreSQL, Redis, Node.js API, React/Nginx) runs via a single `docker-compose up --build`. Nginx acts as a reverse proxy — the browser talks to one origin on port 80, with `/api/*` and `/socket.io/*` proxied internally to the backend container, eliminating CORS entirely in production.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser (React 19 + Vite)                    │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  User Portal │  │ Technician Portal │  │   Admin Console   │  │
│  │  (Self-srv)  │  │  (SLA War Room)  │  │  (KPIs + Audit)  │  │
│  └──────┬───────┘  └────────┬─────────┘  └────────┬──────────┘  │
│         └─────────────────── ┼ ────────────────────┘             │
│                  TanStack Query + Socket.IO Client                │
└──────────────────────────────┼──────────────────────────────────-┘
                               │ HTTP / WebSocket
                    ┌──────────▼──────────┐
                    │   Nginx (port 80)   │
                    │  /api/*  ──────────►│
                    │  /socket.io/* ─────►│  (reverse proxy)
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Express 5 API      │
                    │  + Socket.IO Server │
                    └──────┬───────┬──────┘
                           │       │
              ┌────────────▼┐    ┌─▼──────────────┐
              │  PostgreSQL  │    │  Redis + BullMQ │
              │  (pg pool)   │    │  SLA Job Queue  │
              └─────────────┘    └────────────────-┘
```

---

## Tech Stack

| Layer | Technology | Why |
|:---|:---|:---|
| **Backend Runtime** | Node.js 20 + Express 5 (ESM) | Native async/await, fast I/O, Express 5's async error propagation |
| **Database** | PostgreSQL 16 | Relational integrity for tickets, FKs, partial indexes for notifications |
| **Job Queue** | BullMQ + Redis | Reliable delayed job scheduling with retries — essential for SLA timing |
| **Real-Time** | Socket.IO 4 | Room-based pub/sub; handles WebSocket + HTTP long-poll fallback |
| **Auth** | JWT + Bcrypt | Stateless auth scales horizontally; bcrypt for password hashing |
| **Frontend** | React 19 + Vite 8 | Concurrent rendering; Vite's HMR for fast DX |
| **State** | TanStack React Query v5 | Smart caching, background refetch, optimistic updates |
| **Charts** | Recharts + Chart.js | Rich analytics visualizations on admin dashboard |
| **Containerization** | Docker + Compose + Nginx | One-command full-stack deployment; Nginx as SPA + reverse proxy |

---

## Role-Based Portals

<details>
<summary><b>👤 End-User Portal</b></summary>

- Submit incidents with category, severity (Low / Medium / High / Critical), priority, and description
- Real-time status timeline: tracks every `CREATED → ASSIGNED → IN-PROGRESS → RESOLVED` event
- Live comment thread with WebSocket updates
- Feedback and rating system post-resolution
- Notification center with unread badge counter

</details>

<details>
<summary><b>🛠️ Technician "War Room"</b></summary>

- **Urgency matrix**: tickets sorted ascending by SLA deadline — the closest breach is always at the top
- Live SLA countdown timers (updates every second, turns red on breach)
- One-click lifecycle actions: `Start Work` → `In-Progress`, `Mark Resolved` → `Resolved`
- My Day sidebar: shift summary of open, in-progress, and resolved counts
- Escalation banner triggered in real-time by SLA worker

</details>

<details>
<summary><b>👑 Admin Command Center</b></summary>

- **KPI Strip**: Total tickets, avg resolution time, SLA breach rate, tickets resolved today
- **Queue Health**: BullMQ job counts (active, waiting, delayed, failed)
- **Technician Workload**: per-agent open/in-progress/resolved breakdown with assignment controls
- **System Health**: DB pool status, Redis ping, Socket.IO connected clients count
- **Audit Log Explorer**: filterable, searchable, paginated log of every system event

</details>

---

## Database Schema

```sql
users          → id, name, email, password_hash, role ('User'|'Technician'|'Admin')
tickets        → id, title, description, severity, category, priority, status,
                 created_by, assigned_to, sla_deadline, escalation_level, resolved_at
ticket_logs    → id, ticket_id, action, performed_by, note, created_at  ← audit trail
ticket_comments→ id, ticket_id, user_id, comment, created_at
notifications  → id, user_id, ticket_id, type, message, is_read, created_at
```

Performance indexes on `tickets(status)`, `tickets(assigned_to)`, `tickets(created_at DESC)`, and a partial index on `notifications(user_id, is_read) WHERE is_read = false`.

---

## API Surface

```
POST   /api/auth/register                 → register account
POST   /api/auth/login                    → JWT auth

GET    /api/tickets                       → list tickets (role-filtered)
POST   /api/tickets                       → create incident
GET    /api/tickets/:id                   → get ticket detail
PUT    /api/tickets/:id/status            → update status     [Technician, Admin]
PUT    /api/tickets/:id/assign            → assign technician [Admin]
GET    /api/tickets/:id/logs              → audit trail
GET    /api/tickets/:id/comments          → comment thread
POST   /api/tickets/:id/comments         → add comment
GET    /api/tickets/metrics              → KPI aggregates     [Admin]
GET    /api/tickets/my-stats             → agent shift stats  [Technician]

GET    /api/admin/audit-logs             → paginated audit explorer [Admin]
GET    /api/admin/queue-health           → BullMQ queue metrics      [Admin]
GET    /api/admin/system-health          → DB + Redis + Socket health [Admin]
GET    /api/admin/technician-workload    → per-agent capacity        [Admin]

GET    /api/notifications                → paginated notifications
GET    /api/notifications/unread-count   → lightweight badge count
PATCH  /api/notifications/read-all       → mark all read
PATCH  /api/notifications/:id/read       → mark one read
DELETE /api/notifications/:id            → delete
```

---

## Real-Time Socket Events

| Event | Trigger | Recipients |
|:---|:---|:---|
| `ticket:created` | New ticket submitted | All Admins |
| `ticket:updated` | Status change | Ticket room + role rooms |
| `ticket:assigned` | Admin assigns technician | Assigned technician |
| `ticket:escalated` | BullMQ SLA breach | Ticket room + all Admins |
| `comment:added` | New comment posted | Ticket room |
| `dashboard:metrics-updated` | Any ticket event | Admin + Technician role rooms |

---

## Quick Start

### 🐳 Docker (Recommended — zero dependencies)

```bash
# 1. Clone and configure
git clone https://github.com/Sainathh9/incident-escalation-system.git
cd incident-escalation-system
cp .env.example .env          # edit JWT_SECRET and DB_PASSWORD

# 2. Start the full stack
docker-compose up --build

# 3. Seed demo data (in a new terminal)
docker-compose exec backend node seed_tech_data.js
```

Open **http://localhost** and log in:

| Role | Email | Password |
|:---|:---|:---|
| Admin | `admin@test.com` | `1234` |
| Technician | `tech@test.com` | `1234` |

### 💻 Local Development

**Prerequisites**: Node.js 18+, PostgreSQL 12+, Redis 6+

```bash
# Backend
cd backend && npm install
cp .env.example .env          # fill in DB credentials
node seed_tech_data.js        # seed demo data
npm run dev                   # starts on :5001

# Frontend (new terminal)
cd frontend && npm install
npm run dev                   # starts on :5173
```

---

## Project Structure

```
incident-escalation-system/
├── docker-compose.yml              # Full stack orchestration
├── .env.example                    # Environment variable template
│
├── backend/
│   ├── config/         db.js, redis.js
│   ├── controllers/    ticket, auth, admin, notification
│   ├── middleware/     JWT auth, role allowlist, error handler
│   ├── queues/         BullMQ sla-escalation queue
│   ├── routes/         /tickets, /auth, /admin, /notifications
│   ├── services/       Socket.IO engine, in-app notification service
│   ├── utils/          SLA deadline calculator
│   ├── workers/        slaWorker.js — the escalation engine
│   ├── init.sql        Auto-creates all tables on Docker first boot
│   └── server.js       Express + HTTP server + Socket.IO init
│
└── frontend/
    ├── nginx.conf      SPA routing + /api & /socket.io proxy
    ├── src/
    │   ├── api/        apiFetch wrapper with auto JWT injection
    │   ├── context/    AuthContext (user + role)
    │   ├── pages/
    │   │   ├── Dashboard/
    │   │   │   ├── AdminDashboard.jsx
    │   │   │   ├── TechnicianDashboard.jsx
    │   │   │   ├── UserDashboard.jsx
    │   │   │   ├── panels/       Admin analytics panels
    │   │   │   ├── tech-panels/  Urgency queue, escalation banner
    │   │   │   └── user-panels/  Portal form, timeline, feedback
    │   │   └── TicketDetail.jsx  70/30 split layout + SLA countdown
    │   └── services/   Socket.IO client + room subscriptions
```

---

<div align="center">

Built by [Sainath](https://github.com/Sainathh9) · ISC License

</div>
