# Deployment Management Dashboard

A web-based dashboard for managing service deployments with integrated Cloudflare DNS management.

## Features

- **Deployment Management**: Create, update, track, and delete deployments from GitHub repos or Docker images
- **Cloudflare DNS Integration**: Automate DNS record creation and manage Cloudflare proxy settings
- **Deployment Logs**: Real-time deployment status history and log tracking
- **Settings**: Configure Cloudflare API credentials

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, React Query, Wouter
- **Backend**: Express.js (Node.js), TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Build**: Vite (dev + production)
- **Runtime**: tsx (TypeScript execution)

## Project Structure

```
client/           - React frontend
  src/
    components/   - UI components (shadcn/ui based)
    pages/        - Dashboard, Deployment Detail, Settings
    hooks/        - Custom hooks for API interaction
server/           - Express backend
  index.ts        - App entry point
  routes.ts       - API route definitions
  storage.ts      - Database access layer (Drizzle)
  cloudflare.ts   - Cloudflare API service
  db.ts           - Database connection
shared/           - Shared types between client and server
  schema.ts       - Drizzle schema + Zod validation
  routes.ts       - Shared API route path definitions
script/           - Build scripts
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (provisioned by Replit)
- `PORT` - Server port (defaults to 5000)

## Running the App

```bash
npm run dev      # Development mode
npm run build    # Production build
npm run start    # Production server
npm run db:push  # Push schema changes to database
```

## Security Notes

- Cloudflare API tokens are stored in the database but **never returned in full to clients** - they are redacted (shown as `••••••••`) in all API responses
- All route parameters are validated and return 400 for invalid inputs
- API tokens are also redacted in server-side request logs
