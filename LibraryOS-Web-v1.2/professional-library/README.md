# LibraryOS — Professional Library Management System

A JavaScript web application starter using Node.js, Express and SQLite.

## How to use it
LibraryOS is a browser-based web application. For a cloud-hosted version that you can open from any device without installing software on that device, follow [DEPLOY_ONLINE.md](DEPLOY_ONLINE.md).

For local development only, you need Node.js 20 or newer and npm.

## Setup
1. Extract this project folder.
2. Open a terminal in the `professional-library` folder.
3. Install packages:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env`.
5. Change `SESSION_SECRET` to a long random value and set a strong `ADMIN_PASSWORD`.
6. Start the application:
   ```bash
   npm start
   ```
7. Open http://localhost:3000 and sign in with the username and password configured in `.env`.

The SQLite database and session database are created automatically in `database/`.

## Included in this release
- Administrator login with bcrypt password hashing and rate-limited login attempts
- SQLite persistence and foreign-key enforcement
- Book catalogue: add, search, edit, validated inventory counts, and reversible archive/restore
- Member registration, editing, status management, and reversible archive/restore
- Searchable book/member name suggestions at the circulation desk (database IDs are resolved internally)
- Archive safeguards: books with checked-out copies and members with open loans cannot be archived
- Idempotent SQLite migration adds archive timestamps to existing databases
- Book issue and return transactions
- Availability counts and overdue calculations
- Dashboard summary
- Responsive light/dark interface

## Updating an existing installation
The application automatically adds the `archived_at` columns to an existing `books` and `members` table at startup. Back up the `database/` folder before updating. No manual SQL migration is required for this increment.

## Important production checklist
This is a functional development increment, not yet a complete production deployment. Before opening it to a real public network:
- Use HTTPS and set `NODE_ENV=production`.
- Use a strong, unique `SESSION_SECRET` and administrator password.
- Add CSRF protection, audit logging, automated encrypted backups and restore tests.
- Add librarian account administration, password reset and account lockout policy.
- Add validated workflows for renewals, reservations, fines, and inventory adjustments.
- Review privacy, retention and local library requirements.
- Restrict server/database file permissions and keep dependencies updated.

## Notes
- The initial administrator is created on first database initialization when `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set.
- Do not commit `.env`, database files, or real member information to source control.
- Book and member IDs are numeric database IDs. In the next iteration, the interface should use searchable selectors instead of manually entering IDs when issuing a book.


## Online deployment
See [DEPLOY_ONLINE.md](DEPLOY_ONLINE.md) for the Railway + Docker deployment guide. A persistent volume mounted at `/app/database` is required to keep the SQLite database between deployments.
