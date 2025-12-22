# QBK Manager

Indoor beach volleyball facility management system.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Frontend**: React, TypeScript, MUI, Tailwind CSS
- **Database**: PostgreSQL

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Getting Started

### 1. Clone and Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your PostgreSQL connection string
# DATABASE_URL="postgresql://user:password@localhost:5432/qbk_manager?schema=public"

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

### 3. Start Development Servers

```bash
# Terminal 1 - Backend (runs on :3001)
cd backend
npm run dev

# Terminal 2 - Frontend (runs on :5173)
cd frontend
npm run dev
```

Visit http://localhost:5173

## Features

### MVP: Event/Class Scheduling
- Create, edit, delete events
- List view and calendar view toggle
- Filter by date, event type, court, level, gender, youth
- Event types: Class, Open Play, Private Lesson, League, Other
- Skill levels: Intro I-IV, Intermediate, Advanced
- Gender categories: Men's, Women's, Co-ed

### Data Models
- **Player**: Members with membership types (Gold, Drop-in, None), status tracking, and credit balances
- **Event**: Scheduled classes and sessions
- **Enrollment**: Player-event registration
- **Transaction**: Purchase history

## API Endpoints

### Events
- `GET /api/events` - List all events (with filters)
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Players (scaffolded)
- `GET /api/players` - List all players
- `GET /api/players/:id` - Get player with enrollments
- `POST /api/players` - Create player
- `PUT /api/players/:id` - Update player

## Project Structure

```
qbk-manager/
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── types/
│   └── prisma/
│       └── schema.prisma
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── types/
│   └── ...
└── README.md
```

## Future Extensibility

- Player management UI
- Enrollment/registration flow
- Transaction/payment tracking
- AI-powered scheduling suggestions
- Demand forecasting
- Member dashboard
