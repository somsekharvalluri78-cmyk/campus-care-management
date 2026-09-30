# Campus Care

A role-based College Complaint Management System based on [`spec.md`](spec.md), which remains the single source of truth for product requirements. This implementation uses React, Express, and PostgreSQL.

## Requirements

- Node.js 20 or later (npm is included)
- Docker Desktop installed and running, with Docker Compose
- Git, if you are cloning the repository

## Run locally

1. Open PowerShell in the project root (the folder containing `package.json`). If you have cloned the repository, first change to that folder with `cd path\to\project`.
2. Install dependencies:

   ```powershell
   npm install
   ```

3. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

   The example values are for local development only. For any shared or deployed environment, set a unique `JWT_SECRET` and strong database credentials.

4. Start Docker Desktop, then start PostgreSQL and wait until it reports healthy:

   ```powershell
   docker compose up -d db
   docker compose ps
   ```

   The `db` service should show `healthy` in the `docker compose ps` output.

5. Create the database schema and fictional development demo data:

   ```powershell
   npm run db:setup
   npm run db:seed
   ```

6. Start the API and frontend together:

   ```powershell
   npm run dev
   ```

7. Open the frontend at <http://localhost:5173>. The API listens at <http://localhost:4000>; verify it at <http://localhost:4000/api/health>.

8. On the sign-in screen, select a demo account or enter one of the credentials below.

To stop the app, press `Ctrl+C` in the development terminal. Stop PostgreSQL with `npm run db:down`. The database volume is retained between runs.

## Demo accounts

All accounts are fictional development data. The seeding script gives each account this password: `CampusDemo2026!`.

| Role | ID | Email |
| --- | --- | --- |
| Student | `STU-2026-001` | `student@campus.test` |
| Staff | `STF-001` | `staff@campus.test` |
| Administrator | `ADM-001` | `admin@campus.test` |

## Configuration

Copy `.env.example` to `.env` and adjust these values when needed:

| Variable | Purpose |
| --- | --- |
| `PORT` | Express API port (default `4000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `CLIENT_ORIGIN` | Allowed browser origin (default `http://localhost:5173`) |
| `VITE_API_URL` | Optional frontend API base URL (defaults to `http://localhost:4000/api`) |

Never commit `.env` or use the development credentials in a deployed environment.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start frontend and API in watch mode |
| `npm run build` | Build the frontend for production |
| `npm run start` | Start the API in production mode |
| `npm run db:up` | Start the PostgreSQL container |
| `npm run db:down` | Stop containers without deleting database data |
| `npm run db:setup` | Apply the SQL schema |
| `npm run db:seed` | Insert development demo data |
| `npm test` | Run backend tests |

## Publish publicly

The source is prepared for a Docker-capable host, but this workspace has no hosting account, Git remote, or public domain configured. A real public URL is assigned by the hosting provider after deployment; the localhost address above is not reachable by other people.

1. Push the project to a private or public GitHub repository. Keep `.env` out of Git.
2. Create a managed PostgreSQL database with your hosting provider.
3. Create a web service from this repository using the root `Dockerfile`.
4. Configure these environment variables on the host:

   | Variable | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | The host's private PostgreSQL connection string |
   | `JWT_SECRET` | A newly generated, long random secret; never reuse the example value |
   | `PUBLIC_SITE_URL` | The assigned HTTPS URL, such as `https://your-app.example.com` |
   | `PORT` | Let the host provide this value |

5. Run `npm run db:setup` once against the production database as a deployment/release command before starting the web service. The application process itself does not need database schema-owner privileges. **Do not run `npm run db:seed` on a public database**; it creates publicly documented demo credentials.
6. Set the service health check path to `/api/health` and open the provider-assigned HTTPS URL. Verify `/api/health`, `/robots.txt`, and `/sitemap.xml`.
7. For Google discovery, add the deployed site to Google Search Console and submit `https://your-app.example.com/sitemap.xml`. Crawling and indexing take time and cannot be guaranteed.

The public page allows student self-registration; staff and administrator accounts must be provisioned privately. Complaint data stays behind authentication and role checks; “public” means the site can be reached, not that private student complaints are exposed. Registration does not yet prove that a person owns the submitted email or student ID. Add email verification and validate new accounts against an official student roster before using real student data. Spreadsheet import and the full admin/user-management flows in `spec.md` are also not implemented; complete these gaps and a production security review before launch.

## Current implementation

This first runnable phase covers student self-registration, role-based sign-in, student complaint submission and private tracking, admin assignment, staff status updates, complaint history, notifications, live dashboard counts, and responsive layouts. Student registration does not verify email ownership or enrollment against an official student roster yet. Attachments are visibly marked as unavailable in the demo rather than pretending to upload files. Spreadsheet import, feedback, reporting/export, and full department/category/user administration remain follow-on work from the specification.

See [`docs/API.md`](docs/API.md) for the implemented endpoints and access rules. The complete target behavior remains in [`spec.md`](spec.md).

## Project layout

```text
backend/       Express API, SQL setup, and seed scripts
frontend/      React application
database/      PostgreSQL schema
backend/src/db/ Database setup and fictional demo seed scripts
docs/          API notes
spec.md        Project requirements and acceptance criteria
```

## Troubleshooting

- **Port 5432 is already in use:** stop the other PostgreSQL service or change the published port in `docker-compose.yml` and the host/port in `DATABASE_URL`.
- **Port 4000 or 5173 is already in use:** stop the conflicting process or change `PORT` / the Vite dev-server port.
- **Database connection refused:** check `docker compose ps` and wait for the database health check before running setup scripts.
- **`npm` is not recognized:** install Node.js 20 or later, close and reopen PowerShell, and confirm `node --version` and `npm --version` work.
- **Docker command is not recognized:** install Docker Desktop, open it, wait for it to finish starting, then reopen PowerShell.
- **Docker Desktop says WSL2 cannot start because virtualization is disabled:** enable Intel VT-x or AMD-V/SVM in the computer's UEFI/BIOS settings, make sure the Windows **Virtual Machine Platform** and **Windows Subsystem for Linux** features are enabled, then reboot and verify with `wsl --status`. On a managed device, ask the administrator to enable these settings.
- **Schema or seed needs a clean reset:** stop the app, run `docker compose down -v`, then repeat database setup and seeding. This permanently deletes the local database volume.

## Security note

This is a development setup, not a production deployment. Before deployment, configure production secrets, HTTPS, backups, a restricted database user, file-upload storage and limits, and production-grade monitoring. Do not use real student personal information in local demo data.