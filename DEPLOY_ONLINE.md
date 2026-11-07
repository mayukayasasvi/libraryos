# Put LibraryOS online (no installation on your everyday device)

LibraryOS is a web application. The computer that hosts it runs the Node.js server; librarians and members use it in a normal browser. This package is prepared for Railway using Docker and a persistent volume for its SQLite database.

## Before you begin

You will need: an email account, a GitHub account, and a Railway account. Railway may require a paid plan or usage credit for an always-on service and persistent storage. Check its current pricing before deploying.

## 1. Put the project on GitHub

1. Extract this ZIP on any computer you can use temporarily.
2. Sign in to GitHub and create a **Private** repository named `libraryos`.
3. Upload the contents of the `professional-library` folder (including `Dockerfile`, `railway.json`, `package.json`, `server`, and `public`) to the repository. Do not upload `.env`, a `database` folder, or real member records.

You do not need to install Node.js on the computer that will access the website. GitHub and Railway build and run the app in the cloud.

## 2. Deploy it on Railway

1. Sign in at https://railway.com/ and create a new project.
2. Choose **Deploy from GitHub repo** and select your private `libraryos` repository.
3. Railway detects the included Dockerfile and builds the application.
4. Open the service's **Variables** page and add all of these variables before using the site:
   - `NODE_ENV` = `production`
   - `SESSION_SECRET` = a unique random string at least 32 characters long
   - `ADMIN_USERNAME` = your chosen administrator username
   - `ADMIN_PASSWORD` = a unique, strong administrator password
5. Open the service's **Volumes** page and add a persistent volume mounted at exactly `/app/database`. This is essential: the SQLite database and login sessions are stored there. Without the volume, records can be lost when the hosting container is replaced.
6. In **Networking** / **Public Networking**, generate a public domain. Wait until the deployment is healthy, then open the generated HTTPS address.

The `/health` endpoint should return `{"status":"ok","app":"LibraryOS"}` when the service is running.

## 3. First sign-in

Open the generated website and sign in with the `ADMIN_USERNAME` and `ADMIN_PASSWORD` values you set in Railway. The first start creates the administrator. Keep these credentials private. If an administrator already exists in the database, changing the environment variables does not change that account's password.

## 4. Everyday use

- **Dashboard:** check total titles, copies, active members, current loans, available copies, and overdue loans.
- **Books:** choose **Add book**, enter title and author, then optionally add ISBN, category, publisher, year, and copy count. Use search to find records and Edit to correct them. Archive hides an old record without deleting its history; use Show archived and Restore to bring it back.
- **Members:** choose **Register member**, enter a name and member code (or leave the code blank to generate one), and optionally enter email and phone. Suspend a member to prevent new issues. Archive is for inactive records; it will not allow archiving while they have an open loan.
- **Loans & returns:** choose **Issue a book**, select a book and active member from the suggestions, set a due date, and save. Use **Return** when the physical book comes back. Overdue loans are highlighted automatically.
- **Appearance:** use Toggle theme to switch between light and dark mode.

## Important data and security notes

- Keep the Railway volume attached and do not delete it: it contains the live library database and session store.
- Make regular backups of the SQLite database. Before making a manual backup, stop writes or use SQLite's online backup mechanism; do not rely on copying a live WAL database file alone.
- Never put real member data in a public GitHub repository or share administrator credentials.
- Use the HTTPS Railway domain, keep dependencies updated, and restrict repository and hosting access to trusted people.
- This release is an administrator-operated library website. It does not yet include member self-service accounts, automated email/SMS notifications, barcode hardware integration, online payments, or a tested automated backup/restore interface. Those are planned enhancements, not currently available features.
- Review privacy, data-retention, and library policies that apply in your location before entering real member information.

## Troubleshooting

- **Website does not open:** check the Railway deployment logs and wait for the `/health` check to pass.
- **Login fails:** confirm the username/password. If this is not the first run, the original administrator account remains in the database; changing Railway variables does not reset it.
- **Records disappear after redeploy:** check that the persistent volume is mounted at `/app/database`. Do not continue entering records until storage is fixed.
- **Build fails:** confirm Railway is building from the repository root where the Dockerfile and package.json are located.
