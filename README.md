# TRAINING HUB

A personal fitness and coding progress tracker built with Next.js 14. Integrates with Strava, LeetCode, GitHub, and Apple Health to provide a unified dashboard for physical training, coding practice, and health metrics — all in one dark-themed interface.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [External Integrations](#external-integrations)
  - [Strava](#strava)
  - [LeetCode](#leetcode)
  - [GitHub](#github)
  - [Apple Health (iOS App)](#apple-health-ios-app)
- [API Routes](#api-routes)
- [Storage Layer](#storage-layer)
- [Pages & Features](#pages--features)
- [Data Flow](#data-flow)
- [Local Development](#local-development)
- [Deployment](#deployment)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript 5 |
| Auth & Database | Supabase (PostgreSQL + Auth) |
| Styling | Tailwind CSS 3.4 |
| Charts | Recharts 2.12 |
| Maps | Leaflet + react-leaflet (Strava routes) |
| Date Utilities | date-fns 3.6 |
| Drag & Drop | @dnd-kit |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    TRAINING HUB                          │
│               (Next.js 14 / App Router)                  │
└────────────────────────────┬─────────────────────────────┘
                             │
             ┌───────────────┼────────────────┐
             │               │                │
      ┌──────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
      │  Supabase   │  │  External  │  │  Webhooks  │
      │ (PostgreSQL)│  │    APIs    │  │  (iOS App) │
      └──────┬──────┘  └─────┬──────┘  └─────┬──────┘
             │               │                │
             │    Strava OAuth + Activity Sync │
             │    LeetCode GraphQL             │
             │    GitHub Public Events         │
             │    Apple Health POST            │
             │               │                │
      ┌──────┴───────────────┴────────────────┘
      │           lib/storage.ts              │
      │      (Unified query abstraction)      │
      └──────┬────────────────────────────────┘
             │
      ┌──────┴────────────────────────────────┐
      │            UI Pages                   │
      │  Dashboard · Runs · Calendar          │
      │  Stats · Lab (LeetCode/GitHub/Quant)  │
      │  Workout Logger                       │
      └───────────────────────────────────────┘
```

All pages are `'use client'` components. External API calls are proxied through Next.js route handlers (`app/api/`) to keep secrets server-side. All database access goes through `lib/storage.ts`.

---

## Database Schema

All tables live in Supabase (PostgreSQL) with Row Level Security enabled. Every table is scoped to `user_id`.

| Table | Purpose |
|-------|---------|
| `workout_definitions` | Workout templates with phases and exercises |
| `session_log` | Completed workout sessions with exercise + set logs |
| `personal_bests` | PR records per exercise (weight, reps, date) |
| `user_profile` | User metadata, OAuth tokens, connected usernames |
| `health_stats` | Manual body composition entries (weight, BF%, BMI) |
| `health_metrics` | Apple Health data from iOS webhook (steps, HR, sleep) |
| `leetcode_log` | LeetCode problem entries with status and difficulty |
| `quant_log` | Quantitative/math problem logs |
| `quant_custom_topics` | User-defined topic list for quant |
| `strava_activities` | Synced Strava runs with splits and route polylines |

### health_metrics table

```sql
CREATE TABLE health_metrics (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL,
  value       numeric NOT NULL,
  unit        text NOT NULL,
  date        date NOT NULL,
  timestamp   timestamptz NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, type, date)
);
```

One record per metric type per day — duplicate syncs are safely idempotent via upsert.

---

## Environment Variables

Create `.env.local` for local development. Add all to Vercel for production.

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...       # Used only in health webhook (server-side)

# App URL (used in Strava OAuth redirect)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Strava OAuth
STRAVA_CLIENT_ID=12345
STRAVA_CLIENT_SECRET=abcdef...

# Apple Health Webhook
HEALTH_WEBHOOK_SECRET=your-secret-key    # Must match iOS app's X-API-Key header
HEALTH_USER_ID=uuid-of-your-user         # Your Supabase auth user ID
```

---

## External Integrations

### Strava

Strava is connected via OAuth 2.0 to automatically sync running and cycling activities.

**OAuth Flow:**

```
User clicks "Connect Strava"
  → GET /api/strava/auth
  → Redirects to strava.com/oauth/authorize
  → User approves
  → Strava redirects to /api/strava/callback?code=xxx
  → Server exchanges code for access/refresh tokens
  → Redirects to /runs?strava=save&at=...&rt=...&exp=...&athlete=...
  → Client-side /runs page saves tokens to Supabase user_profile
```

**Token Storage:** Access token, refresh token, expiry timestamp, and athlete ID are stored in `user_profile`. The sync endpoint auto-refreshes the token if it's expired.

**Sync:**

```
POST /api/strava/sync
Body: { accessToken, refreshToken, expiresAt, after? }
```

- Fetches activities from Strava API v3 in pages of 50 (up to 200 on initial sync)
- `after` param enables incremental syncs — only fetches activities since last sync
- Fetches detailed activity for each result to capture per-km splits
- Decodes Strava encoded polyline for route map rendering
- Returns refreshed tokens if rotation occurred

**Strava Developer Settings:**
- Callback domain must match `NEXT_PUBLIC_APP_URL` — set to `training-hub-eta.vercel.app` for production, `localhost` for local dev

---

### LeetCode

LeetCode does not have an official public API. The integration uses the unofficial GraphQL endpoint at `https://leetcode.com/graphql`.

**Stats (public — no auth needed):**

```
GET /api/leetcode/stats?username=yourname
```

Returns solved counts by difficulty (Easy/Medium/Hard), global ranking, current streak, total active days, and a 52-week submission calendar heatmap.

**GraphQL query used:**
```graphql
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    submitStats { acSubmissionNum { difficulty count } }
    profile { ranking }
    userCalendar { streak totalActiveDays submissionCalendar }
  }
}
```

**Submission Sync:**

```
POST /api/leetcode/sync
Body: { username, session?, offset? }
```

Two modes:
- **Without session:** Fetches last 50 accepted submissions via `recentAcSubmissionList` (public)
- **With session cookie:** Paginates full submission history via `submissionList` (up to 20 pages × 20 = 400 submissions)

To enable full history sync, paste your `LEETCODE_SESSION` cookie value into Settings on the LeetCode page in the app. The cookie is stored in your user profile.

---

### GitHub

GitHub activity is fetched entirely client-side using the public GitHub Events API — no authentication required.

```
GET https://api.github.com/users/{username}/events/public
```

- Filters `PushEvent` types
- Extracts repo name, push date, commit messages, and commit SHAs
- Groups by repository for per-repo push history
- Computes 30-day rolling activity count and sparkline data

GitHub username is set in the Stats page profile editor and stored in `user_profile`.

---

### Apple Health (iOS App)

A companion iOS app reads from Apple HealthKit and POSTs metrics to the Training HUB webhook endpoint. There is no OAuth flow — authentication is via a shared API key.

**Endpoint:**

```
POST https://your-app.vercel.app/api/health
Headers:
  Content-Type: application/json
  X-API-Key: [HEALTH_WEBHOOK_SECRET]

Body:
{
  "metrics": [
    {
      "type": "HKQuantityTypeIdentifierStepCount",
      "value": 8432,
      "unit": "count",
      "timestamp": "2026-04-01T23:59:00Z"
    },
    {
      "type": "HKQuantityTypeIdentifierRestingHeartRate",
      "value": 54,
      "unit": "bpm",
      "timestamp": "2026-04-01T08:00:00Z"
    },
    {
      "type": "HKCategoryTypeIdentifierSleepAnalysis",
      "value": 7.5,
      "unit": "hr",
      "timestamp": "2026-04-01T07:30:00Z"
    }
  ]
}
```

**Supported metric types:**

| HealthKit Identifier | Displayed As | Unit |
|---------------------|-------------|------|
| `HKQuantityTypeIdentifierStepCount` | Steps bar chart | count |
| `HKQuantityTypeIdentifierRestingHeartRate` | Resting HR line chart | bpm |
| `HKCategoryTypeIdentifierSleepAnalysis` | Sleep bar chart | hr |

**Important:** The iOS app groups samples by **UTC date** (not local calendar date) to match the server's `timestamp.slice(0, 10)` extraction. This prevents duplicate records when the device timezone offset causes two local midnights to fall on the same UTC day.

**Server-side auth:** The endpoint uses the Supabase service role key (bypasses RLS) and the hardcoded `HEALTH_USER_ID` env var to write metrics for the correct user, since the iOS app has no Supabase session.

---

## API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/strava/auth` | GET | Session | Initiates Strava OAuth redirect |
| `/api/strava/callback` | GET | None | Handles OAuth code exchange, redirects to /runs |
| `/api/strava/sync` | POST | Tokens in body | Fetches and returns Strava activities |
| `/api/leetcode/stats` | GET | None | Fetches LeetCode profile stats via GraphQL |
| `/api/leetcode/sync` | POST | Optional session | Syncs submission history via GraphQL |
| `/api/health` | POST | X-API-Key header | Ingests Apple Health metrics from iOS app |

---

## Storage Layer

`lib/storage.ts` is the single abstraction for all database access. Every function:
1. Gets the current user ID via `supabase.auth.getUser()`
2. Scopes all queries to `user_id`
3. Returns typed objects matching `lib/types.ts`

Key functions:

```typescript
// Workouts
getWorkouts()                          // Returns all + seeds defaults if empty
getWorkoutById(id)
saveWorkout(workout)
deleteWorkout(id)

// Sessions & PBs
getSessions()
saveSession(session)
getPBs()
savePBs(pbs)

// Health
getHealthEntries()
saveHealthEntries(entries)
getHealthMetrics(type, days)           // e.g. getHealthMetrics('HKQuantityTypeIdentifierStepCount', 14)

// Profile
getProfile()
saveProfile(profile)                   // Stores Strava tokens, usernames, etc.

// LeetCode & Quant
getLeetCodeEntries()
saveLeetCodeEntry(entry)
deleteLeetCodeEntry(id)
getQuantEntries()
saveQuantEntry(entry)

// Strava
getStravaActivities()
upsertStravaActivities(activities)     // Conflict key: activity id
```

---

## Pages & Features

### Dashboard (`/`)
- Today's workout recommendations
- Weekly session count and streak
- Quick-access workout cards (Legs, Push, Pull, Run)
- Recent sessions list
- Current weight and body fat snapshot

### Runs (`/runs`)
- Connect Strava button (initiates OAuth)
- Auto-syncs new activities on page load
- Stats: total runs, distance, elevation, avg pace, avg HR
- Personal best estimates (5K, 10K, half marathon) derived from recorded splits
- 12-week mileage bar chart
- Activity list with click-to-open detail modal
  - Route map (Leaflet with CartoDB dark tiles)
  - Per-km splits table
  - 8-stat grid (distance, time, pace, elevation, HR, cadence, calories)

### Calendar (`/calendar`)
- Monthly grid view
- Activity dots per day: blue (workouts), orange (Strava runs), teal (LeetCode), amber (GitHub commits)
- Day detail panel on click
- Universal heatmap tab showing activity intensity over time

### Progress (`/progress`)
- Personal best history per exercise
- Weight over time chart

### Stats (`/stats`)
- Body composition: weight, body fat %, BMI
- Log new measurements
- History table with delete
- Apple Health section (last 14 days):
  - Steps bar chart with 10,000 step goal line
  - Resting HR line chart
  - Sleep hours bar chart with 8hr goal line
- Profile editor: name, height, weight unit, GitHub/LeetCode usernames

### Lab — Overview (`/lab`)
- Aggregated stats pills: total sessions, commits, LeetCode solves, runs
- Stacked activity chart (daily, by type: workouts, commits, LeetCode, training)
- Universal heatmap across all activity types

### Lab — LeetCode (`/lab/leetcode`)
- Auto-syncs on load using stored username + session cookie
- Stats dashboard: solved count, difficulty bars, streak, ranking
- 26-week submission heatmap
- Problem table with difficulty/status/language filters
- Manual problem entry form
- LEETCODE_SESSION cookie panel with instructions

### Lab — GitHub (`/lab/github`)
- Per-repo push history
- 30-day activity summary
- Daily commit sparklines

### Lab — Quant (`/lab/quant`)
- Log quantitative/math problems
- Custom topic management

### Workout Logger (`/workout/[id]`)
- Phase-based workout execution
- Per-set logging (weight × reps)
- Real-time PR detection with toast notifications
- Retrospective logging: date picker to log past workouts
- Session saved on "FINISH WORKOUT"

---

## Data Flow

**Workout logging:**
```
User logs sets → in-memory state → FINISH WORKOUT
  → saveSession() → session_log table
  → savePBs() → personal_bests table (if new PR)
```

**Strava sync:**
```
Page load → getStravaActivities() from DB
  → if connected: POST /api/strava/sync with after=lastSyncTimestamp
  → new activities returned → upsertStravaActivities()
  → refreshed tokens saved to user_profile if rotated
```

**LeetCode sync:**
```
Page load → getLeetCodeEntries() from DB
  → GET /api/leetcode/stats?username=xxx → update UI stats
  → POST /api/leetcode/sync → deduplicate by titleSlug
  → new entries merged into DB preserving user notes
```

**Apple Health:**
```
iOS app opens → reads HealthKit (last 3 days)
  → groups samples by UTC date
  → POST /api/health with X-API-Key header
  → server upserts to health_metrics (one row per type per day)
  → stats page reads via getHealthMetrics() and renders charts
```

**GitHub:**
```
Lab/Calendar page loads → fetch github.com/users/{username}/events/public
  → filter PushEvents → group by repo/date
  → rendered client-side, not stored in DB
```

---

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in Supabase URL, anon key, and other vars

# Run dev server
npm run dev
```

The app runs on `http://localhost:3000`.

For Strava OAuth to work locally, add `localhost` as an authorized callback domain in your Strava API settings at strava.com/settings/api.

---

## Deployment

The app is deployed to **Vercel** with automatic deployments from the `main` branch on GitHub.

**Required Vercel Environment Variables** (Settings → Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
HEALTH_WEBHOOK_SECRET
HEALTH_USER_ID
```

After adding or changing env vars, trigger a new deployment for them to take effect.

**Note:** `react-leaflet` requires `legacy-peer-deps=true` in `.npmrc` due to a peer dependency conflict with React 19. This file is committed to the repo and Vercel picks it up automatically.
