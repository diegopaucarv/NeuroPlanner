# NeuroPlanner Web Version Setup

## Overview

NeuroPlanner now has a dual-stack architecture:
- **Mobile**: React Native + Expo (existing native app)
- **Web**: Next.js 16 + Neon PostgreSQL + Better Auth (new web app)

## Technology Stack

### Backend
- **Framework**: Next.js 16 (App Router)
- **Database**: Neon PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Better Auth (email + password)

### Frontend
- **UI Framework**: React 19
- **Styling**: Tailwind CSS v4
- **Type Safety**: TypeScript

## Database Schema

The database consists of:

1. **Better Auth Tables** (automatic)
   - `user` - User accounts
   - `session` - Session management
   - `account` - Provider accounts
   - `verification` - Email verification

2. **NeuroPlanner Tables**
   - `entities` - Base entities (goals, projects, tasks, habits)
   - `objectives` - Hierarchical objectives with progress tracking
   - `time_series` - Time-based metrics and tracking data

## Environment Variables

Required environment variables (set in v0 project settings):

```
DATABASE_URL=<Neon connection string>
NEON_AUTH_COOKIE_SECRET=<32+ char random string>
```

Optional:
```
NEXT_PUBLIC_AUTH_URL=<auth base URL, defaults to localhost:3000>
BETTER_AUTH_URL=<custom auth domain>
```

## Development

### Start the web development server:
```bash
npm run dev
```

This starts Next.js on `http://localhost:3000`

### Sign In / Sign Up

The app requires authentication:
- **Sign Up**: `/sign-up` - Create a new account
- **Sign In**: `/sign-in` - Log in to existing account
- **Home**: `/` - Protected dashboard (redirects to `/sign-in` if not authenticated)

## Project Structure

```
app/
├── api/auth/[...all]/  - Better Auth handler
├── sign-in/            - Authentication page
├── sign-up/            - Registration page
├── layout.tsx          - Root layout
├── page.tsx            - Home page (protected)
└── globals.css         - Global styles

lib/
├── auth.ts             - Better Auth configuration
├── auth-client.ts      - Client-side auth utilities
└── db/
    ├── index.ts        - Drizzle client
    └── schema.ts       - Database schema

public/                 - Static assets
tailwind.config.ts      - Tailwind configuration
next.config.ts          - Next.js configuration
postcss.config.mjs      - PostCSS configuration
tsconfig.json           - TypeScript configuration
```

## Key Implementation Details

### Platform-Specific Imports

The codebase maintains separation:
- **Mobile**: Uses `/src` directory with React Native components
- **Web**: Uses `/app` directory with Next.js components and API routes

Both can share business logic via Zustand stores and utility functions, but UI and database access are platform-specific.

### Database Access Pattern

All user data queries MUST be scoped by `userId`:

```typescript
'use server'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getObjectives() {
  const userId = await getUserId()
  return db
    .select()
    .from(objectives)
    .where(eq(objectives.userId, userId))
}
```

## Next Steps

1. Build out the web dashboard UI components
2. Implement objective management (CRUD operations)
3. Add time-series metrics tracking
4. Build hierarchical navigation for goals/projects/tasks/habits
5. Sync shared business logic between mobile and web versions
