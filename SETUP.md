# Quick Setup for VS Code

Follow these steps exactly to get the app running locally.

---

## Step 1: Replace Package.json

After downloading and extracting the project, open a terminal in the project folder and run:

**Windows (PowerShell):**
```powershell
Copy-Item package.local.json package.json -Force
```

**Mac/Linux:**
```bash
cp package.local.json package.json
```

---

## Step 2: Install Dependencies

```bash
npm install
```

---

## Step 3: Create Environment File

```bash
cp .env.example .env
```

Then edit the `.env` file with your database details.

---

## Step 4: Setup PostgreSQL Database

### Option A: Using pgAdmin (Easy)
1. Open pgAdmin
2. Right-click on Databases → Create → Database
3. Name it `myapp` and click Save

### Option B: Using Command Line
```bash
psql -U postgres -c "CREATE DATABASE myapp;"
```

---

## Step 5: Update .env File

Edit your `.env` file with your actual PostgreSQL credentials:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/myapp
SESSION_SECRET=any-random-text-here-for-security
PORT=5000
NODE_ENV=development
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

---

## Step 6: Push Database Schema

```bash
npm run db:push
```

This creates all the necessary tables.

---

## Step 7: Run the App (Two Terminals)

### Terminal 1 - Backend:
```bash
npm run dev
```

### Terminal 2 - Frontend:
```bash
npm run dev:frontend
```

---

## Step 8: Open the App

Go to: **http://localhost:5173**

---

## Common Issues

### "ECONNREFUSED" error
PostgreSQL is not running. Start it from Services (Windows) or:
```bash
# Mac
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### "database does not exist" error
Create the database first (Step 4).

### Port 5000 in use
Another app is using port 5000. Stop it or change PORT in `.env`.

---

That's it! The app should be running now.
