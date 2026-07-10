# SyncTalk 🚀

Hey! Welcome to SyncTalk. I built this project to solve a problem my team was having with keeping track of scattered conversations. It's a real-time team chat application with a twist: it uses AI to automatically summarize long discussions and transcribe voice notes so you don't have to listen to a 5-minute ramble.

Built with the MERN stack (MongoDB, Express, React, Node) and structured as an NPM workspace, featuring modern DevOps practices and robust observability.

## Quick Start

### Local Development

1. **Install everything**
   Just run `npm install` from the root. Thanks to NPM workspaces, this will pull down dependencies for both the client and server.

2. **Database setup**
   Make sure MongoDB is running on port 27017, or drop your Atlas URI into `server/.env`.

3. **API Keys (Optional but recommended)**
   We use Google's Gemini API for AI features. Grab a key and toss it into `server/.env`:
   ```env
   GEMINI_API_KEY=your_key_here
   ```

4. **Populate some fake data**
   Want to see it in action without creating 5 accounts yourself? Run:
   ```bash
   npm run seed
   ```

5. **Fire it up!**
   ```bash
   npm run dev
   ```

The frontend will pop up at `http://localhost:5173`. Backend runs on port 5000.

### Docker Support
You can easily spin up the entire stack using Docker Compose:
```bash
docker-compose up --build
```
This will start MongoDB, the Node API, and the React frontend served by Nginx.

## Observability & DevOps
- **Pino** is used for structured logging and HTTP request tracing.
- **Sentry** is integrated for robust error tracking and profiling.
- **PM2** configuration is available via `server/ecosystem.config.cjs` for clustered production deployments.
- **Endpoints**:
  - `GET /api/health` - Deep health check (verifies MongoDB connection).
  - `GET /api/version` - Returns the current application version.
- **Backups**: A MongoDB backup script is available at `server/scripts/backup.sh`.

## Demo Users

If you seeded the database, you can log in with any of these:
- alice@synctalk.dev / password123
- bob@synctalk.dev / password123
- carol@synctalk.dev / password123
- dave@synctalk.dev / password123

Hit me up if you run into any issues running it locally!
