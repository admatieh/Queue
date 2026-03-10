# QueueBuddy

A real-time venue queue and seat management platform built with React, Express, and MongoDB.

---

## Supported Platforms

| Platform | Status |
|----------|--------|
| Linux (Ubuntu, Debian, Arch, etc.) | ✅ Fully supported |
| macOS | ✅ Fully supported |
| Windows 10/11 (CMD & PowerShell) | ✅ Fully supported |

---

## Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| **Node.js** | **v20.19+** | Required by Vite 7. Use [nvm](https://github.com/nvm-sh/nvm) (Linux/macOS) or [nvm-windows](https://github.com/coreybutler/nvm-windows) (Windows) |
| **npm** | v10+ | Comes with Node 20 |
| **MongoDB** | v6+ | Run locally or use [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier) |

### Check your versions

```bash
node -v    # must be >= 20.19
npm -v     # must be >= 10
```

---

## Installation

Works identically on Windows CMD, PowerShell, and Linux/macOS terminals.

```bash
# 1. Clone the repo
git clone <repo-url>
cd QueueBuddy

# 2. Install dependencies (includes cross-env, tsx, etc.)
npm install
```

---

## Environment Setup

Copy the example env file and fill in your values:

**Linux / macOS**
```bash
cp .env.example .env
```

**Windows (CMD)**
```cmd
copy .env.example .env
```

**Windows (PowerShell)**
```powershell
Copy-Item .env.example .env
```

Then open `.env` and set at minimum:

```env
MONGODB_URI=mongodb://localhost:27017/queuebuddy
SESSION_SECRET=some_long_random_string_here
```

> **Generate a secure secret (any platform):**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

## Development Commands

All commands work on Windows and Linux without modification.

| Command | Description |
|---------|-------------|
| `npm run dev` | Build client → start production server (port 5000) |
| `npm run dev:split` | Vite dev server (port 5173, HMR) + Express API (port 5000) simultaneously |
| `npm run dev:server` | Express API server only |
| `npm run dev:client` | Vite dev server only |

### Recommended for day-to-day development

```bash
npm run dev:split
```

- Frontend → `http://localhost:5173` (with Hot Module Replacement)
- API → `http://localhost:5000` (Vite proxies `/api`, `/auth`, `/uploads` to it automatically)

---

## Build & Production

| Command | Description |
|---------|-------------|
| `npm run build` | Build React client to `dist/public/` |
| `npm run build:full` | Build client + bundle server to `dist/index.cjs` (production deploy artifact) |
| `npm run clean` | Delete the `dist/` folder |
| `npm start` | Start the production server (requires `npm run build` first) |

### Full production build

```bash
npm run build
npm start
# Server running at http://localhost:5000
```

---

## Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:seed` | Seed the database with sample data |
| `npm run db:reset` | Clear and re-seed the database |

---

## Type Checking

```bash
npm run check
```

Runs `tsc` — no output means no errors.

---

## Troubleshooting

### `cross-env: command not found`
Run `npm install` — `cross-env` is a devDependency and must be installed locally.

### `vite: command not found` or `crypto.hash is not a function`
You are running Node.js < 20. Upgrade:
```bash
# Linux/macOS with nvm
nvm install 20 && nvm use 20

# Windows with nvm-windows
nvm install 20.20.1
nvm use 20.20.1
```

### `Could not find the build directory`
Run `npm run build` before `npm start`.

### MongoDB connection errors
- Ensure MongoDB is running locally: `mongod` (Linux/macOS) or start the MongoDB service on Windows
- Or use a remote Atlas URI in `.env`: `MONGODB_URI=mongodb+srv://...`

### Windows: `'vite' is not recognized`
Always use `npm run <script>` — never call `vite` or `tsx` directly. The local binaries in `node_modules/.bin` are resolved automatically by npm.

### Windows: Port already in use
```powershell
# Find what is using port 5000
netstat -ano | findstr :5000
# Kill by PID
taskkill /PID <pid> /F
```

### Linux: Port already in use
```bash
lsof -ti:5000 | xargs kill -9
```

---

## Project Structure

```
QueueBuddy/
├── client/          # React frontend (Vite + TypeScript)
│   └── src/
├── server/          # Express API (TypeScript)
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── services/
├── shared/          # Types and schemas shared by client + server
├── script/
│   └── build.ts     # Full esbuild production bundler
├── dist/            # Build output (git-ignored)
├── uploads/         # Uploaded images (git-ignored)
├── .env.example     # Environment variable template
└── vite.config.ts   # Vite configuration
```

---

## Platform-Specific Notes

| Topic | Note |
|-------|------|
| Line endings | The repo has no explicit `.gitattributes` — Windows Git may convert LF→CRLF. If you see issues, run `git config core.autocrlf false` |
| File paths | All paths use Node's `path` module internally — no hardcoded slashes |
| Shell scripts | There are none — all scripts are `npm run` commands or Node.js files |
| `NODE_ENV` | Set via `cross-env` — works on CMD, PowerShell, bash, and zsh |
