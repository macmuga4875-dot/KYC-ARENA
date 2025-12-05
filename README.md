# Exchange Submissions App

A full-stack web application with user authentication, exchange management, and submission tracking.

## Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS, Radix UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based auth

## Prerequisites

Before running this project locally, make sure you have:

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **PostgreSQL** (v14 or higher) - [Download here](https://www.postgresql.org/download/)
3. **npm** (comes with Node.js)

## Quick Start Guide for VS Code

### Step 1: Download the Project

Download the project as a ZIP file from Replit and extract it to your desired location.

### Step 2: Initial Setup

1. **Open the project in VS Code**
   ```bash
   cd your-project-folder
   code .
   ```

2. **Replace package.json with the local version**
   ```bash
   # On Windows (PowerShell)
   Copy-Item package.local.json package.json -Force
   
   # On Mac/Linux
   cp package.local.json package.json
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

### Step 3: Database Setup

1. **Create a PostgreSQL database**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create the database
   CREATE DATABASE myapp;
   
   # Exit
   \q
   ```

2. **Create your environment file**
   ```bash
   # Copy the example file
   cp .env.example .env
   ```

3. **Edit `.env` with your database credentials**
   ```
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/myapp
   SESSION_SECRET=your-random-secret-key-here
   PORT=5000
   NODE_ENV=development
   ```

4. **Push the database schema**
   ```bash
   npm run db:push
   ```

### Step 4: Run the Application

You need to run two terminals simultaneously:

**Terminal 1 - Backend Server:**
```bash
npm run dev
```
This starts the Express server on port 5000.

**Terminal 2 - Frontend Dev Server:**
```bash
npm run dev:frontend
```
This starts the Vite development server on port 5173.

### Step 5: Access the Application

Open your browser and go to: **http://localhost:5173**

The frontend will proxy API requests to the backend automatically.

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── pages/          # Page components
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   └── index.html
├── server/                 # Backend Express server
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database operations
│   └── auth.ts             # Authentication logic
├── shared/                 # Shared code
│   └── schema.ts           # Database schema (Drizzle)
├── .vscode/                # VS Code settings
├── .env.example            # Environment variables template
├── package.local.json      # Local package.json (use this)
├── vite.config.local.ts    # Local Vite config
└── drizzle.config.ts       # Drizzle ORM config
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the backend server |
| `npm run dev:frontend` | Start the frontend dev server |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push schema to database |
| `npm run db:generate` | Generate migrations |
| `npm run db:migrate` | Run migrations |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection URL | Yes |
| `SESSION_SECRET` | Secret for session encryption | Yes |
| `PORT` | Server port (default: 5000) | No |
| `NODE_ENV` | Environment mode | No |

## Troubleshooting

### "Cannot find module" errors
Make sure you've run `npm install` after copying `package.local.json` to `package.json`.

### Database connection errors
- Ensure PostgreSQL is running
- Verify your DATABASE_URL in `.env` is correct
- Make sure the database exists

### Port already in use
- Backend runs on port 5000
- Frontend runs on port 5173
- Kill any processes using these ports before starting

### CORS errors
The frontend dev server is configured to proxy `/api` requests to the backend. Make sure both servers are running.

## Building for Production

```bash
# Build the application
npm run build

# Start production server
npm run start
```

The production build will be in the `dist` folder.

## VS Code Extensions (Recommended)

The `.vscode/extensions.json` file includes recommended extensions. VS Code will prompt you to install them when you open the project:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript support
- Path IntelliSense

## License

MIT
