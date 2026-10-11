# Campus Care 🎓

[![CI Pipeline](https://github.com/somsekharvalluri78-cmyk/campus-care-management/actions/workflows/ci.yml/badge.svg)](https://github.com/somsekharvalluri78-cmyk/campus-care-management/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Backend-Express%20%2B%20Node.js-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Container-Docker-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/somsekharvalluri78-cmyk/campus-care-management)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-46E3B7?logo=render&logoColor=white)](https://campus-care-trzj.onrender.com)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live%20Frontend-black?logo=vercel)](https://campus-care-management.vercel.app)

> **Campus Care** is a modern, full-stack, role-based College Complaint Management System built with **React**, **Express**, and **PostgreSQL**. It empowers students to submit and track issues, gives department officers a focused queue to investigate and resolve grievances, and equips administrators with analytics, staff assignment tools, and spreadsheet reporting.

**🌐 Live Deployments:**
- **Full-Stack Application (Express + PostgreSQL + React):** [https://campus-care-trzj.onrender.com](https://campus-care-trzj.onrender.com)
- **Frontend SPA (Vercel):** [https://campus-care-management.vercel.app](https://campus-care-management.vercel.app)

Based on [`spec.md`](spec.md), which serves as the specification and single source of truth for product requirements.

---

## 🚀 Key Features

### 👨‍🎓 Student Portal
- **Secure Self-Registration & Authentication**: Sign up with student ID, college email, department, year, and section.
- **Complaint Submission**: Choose category, priority (Low, Medium, High, Critical), title, description, and supporting file attachments.
- **Private Case Tracking**: Track real-time progress and history without exposing private grievances to other students.
- **Resolution Review & Feedback**: Once resolved by staff, review the outcome, leave feedback, and close the case.

### 👩‍💼 Staff / Department Officers
- **Focused Work Queue**: View cases routed and assigned to your department.
- **Investigation Workflow**: Move statuses across `Assigned` ➔ `In Progress` ➔ `Waiting for Student` ➔ `Resolved`.
- **Audit Remarks**: Add context, remarks, and audit trail updates visible to students and administrators.

### 🛡️ Administrator Service Desk
- **Executive Metrics**: Live overview of total students, open cases, critical priority tickets, and resolution metrics.
- **Staff Assignment**: Route and delegate complaints directly to available department officers.
- **CSV Data Export**: Export complaint records to CSV with one click for institutional reporting and compliance.
- **Complete Audit Trail**: View immutable chronological timelines for every action taken.

---

## 🛠️ Tech Stack & Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                   React + Vite SPA                       │
│        (Role-Based Dashboards & Responsive UI)           │
└────────────────────────────┬─────────────────────────────┘
                             │  HTTP / REST (JWT Auth)
┌────────────────────────────▼─────────────────────────────┐
│                   Express.js API                         │
│       (Helmet, Rate-Limiting, Zod Validation)            │
└────────────────────────────┬─────────────────────────────┘
                             │  node-postgres (pg Pool)
┌────────────────────────────▼─────────────────────────────┐
│                  PostgreSQL Database                     │
│    (Complaints, Categories, Departments, History, Audit) │
└──────────────────────────────────────────────────────────┘
```

---

## ⚡ Quickstart (Run Locally)

### Prerequisites
- [Node.js 20+](https://nodejs.org/) (npm included)
- [Docker Desktop](https://www.docker.com/) (running)
- Git

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/somsekharvalluri78-cmyk/campus-care-management.git
   cd campus-care-management
   ```

2. **Install dependencies**:
   ```powershell
   npm install
   ```

3. **Configure environment**:
   ```powershell
   Copy-Item .env.example .env
   ```

4. **Start PostgreSQL database (Docker)**:
   ```powershell
   npm run db:up
   ```

5. **Initialize schema and fictional demo data**:
   ```powershell
   npm run db:setup
   npm run db:seed
   ```

6. **Start the development server**:
   ```powershell
   npm run dev
   ```

7. **Access the application**:
   - Web App: [http://localhost:5173](http://localhost:5173)
   - API Health: [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

## 🔑 Demo Accounts

Use these pre-seeded accounts for testing each role:

| Role | Login ID | Email | Password |
| --- | --- | --- | --- |
| **Student** | `STU-2026-001` | `student@campus.test` | `CampusDemo2026!` |
| **Staff** | `STF-001` | `staff@campus.test` | `CampusDemo2026!` |
| **Administrator** | `ADM-001` | `admin@campus.test` | `CampusDemo2026!` |

*(In development mode, you can also click the quick-login demo buttons on the sign-in screen).*

---

## ☁️ Lifetime Free Cloud Deployment (100% Free Forever)

This project is configured to run on **100% Lifetime Free** platforms without 30-day database expirations or paid requirements.

### 1. Database: Neon PostgreSQL (Lifetime Free, No 30-Day Expiry)
Unlike Render's temporary 30-day PostgreSQL databases, [Neon](https://neon.tech) offers a permanent, generous free PostgreSQL tier that never expires:
1. Sign up for free at [neon.tech](https://neon.tech).
2. Create a project (e.g. `campus-care`).
3. Copy the pooled connection string (`DATABASE_URL`).
4. Apply schema and seed data once:
   ```bash
   npm run db:setup
   npm run db:seed
   ```

### 2. Recommended Hosting: Vercel Full-Stack (Frontend + Serverless API)
Deploy the entire application (React + Express API) on Vercel under a single domain:
1. Go to [vercel.com](https://vercel.com) and import your GitHub repository `somsekharvalluri78-cmyk/campus-care-management`.
2. In **Environment Variables**, add:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `JWT_SECRET`: Any random secure key (or leave default).
3. Click **Deploy**. Both the frontend and `/api` backend run under your `.vercel.app` URL with zero sleeping delays.

### 3. Alternative Hosting: Koyeb (Eco Free Tier)
Deploy as a persistent Node.js web service without sleeping:
1. Sign up at [koyeb.com](https://www.koyeb.com).
2. Create a **Web Service** connected to your GitHub repository.
3. Build command: `npm run build`
4. Run command: `npm start`
5. Add environment variable `DATABASE_URL` pointing to your Neon database.

### 4. Alternative: Render Web Service (Using Neon DB)
If you prefer Render:
1. Do **not** use Render's 30-day PostgreSQL database.
2. Create a **Web Service** on [Render.com](https://render.com).
3. Build Command: `npm ci --include=dev && npm run build`
4. Start Command: `npm start`
5. Add environment variable `DATABASE_URL` set to your Neon PostgreSQL URL.

### 5. Instant Expo Backup (Localhost + Free Tunnel)
If presenting at a college expo or project review:
1. Run `npm run build && npm start`
2. In a second terminal, run `npm run tunnel` to get an instant, rock-solid public HTTPS link with zero cloud dependency.

---

## 📜 Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Runs backend API (port 4000) and frontend (port 5173) concurrently in watch mode |
| `npm run build` | Compiles the React/Vite frontend into `frontend/dist/` |
| `npm run start` | Runs the production Express server (serves API + built frontend) |
| `npm test` | Runs Node.js test suite for backend business logic |
| `npm run db:up` | Starts local PostgreSQL container in background |
| `npm run db:down` | Stops local PostgreSQL container |
| `npm run db:setup` | Executes `database/schema.sql` migrations |
| `npm run db:seed` | Seeds database with demo departments, categories, users, and cases |

---

## 📁 Repository Structure

```text
├── .github/workflows/    # CI Pipeline (automated test & build verification)
├── backend/              # Express API, auth, business logic, and test suites
│   ├── src/              # Server routes, database pool, configuration
│   └── test/             # Unit and integration tests
├── database/             # PostgreSQL schema DDL
├── docs/                 # API documentation (API.md)
├── frontend/             # React (Vite) single-page application
│   └── src/              # App.jsx, styles.css, main.jsx
├── Dockerfile            # Production multi-stage Docker container
├── docker-compose.yml    # Development PostgreSQL service definition
├── render.yaml           # Cloud deployment blueprint
├── spec.md               # Product specification and requirements document
└── package.json          # Root workspace configuration
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).