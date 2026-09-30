# Campus Care 🎓

[![CI Pipeline](https://github.com/somsekharvalluri78-cmyk/campus-care-management/actions/workflows/ci.yml/badge.svg)](https://github.com/somsekharvalluri78-cmyk/campus-care-management/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Backend-Express%20%2B%20Node.js-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Container-Docker-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

> **Campus Care** is a modern, full-stack, role-based College Complaint Management System built with **React**, **Express**, and **PostgreSQL**. It empowers students to submit and track issues, gives department officers a focused queue to investigate and resolve grievances, and equips administrators with analytics, staff assignment tools, and spreadsheet reporting.

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

## ☁️ Deploy to the Cloud (Free Hosting on Render)

This repository includes a `render.yaml` blueprint for 1-click deployment on Render:

1. Sign up or log into [Render.com](https://render.com).
2. Click **New +** ➔ **Blueprint**.
3. Connect your GitHub repository `somsekharvalluri78-cmyk/campus-care-management`.
4. Render will automatically read `render.yaml`, provision a free PostgreSQL database, build the frontend, run database setup, and start the app!

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