# QBK Manager - AI Coding Guidelines

## Architecture Overview
Full-stack volleyball facility management system with Express backend and React frontend. Follows layered architecture: Routes → Controllers → Services → Prisma ORM.

**Key Files:**
- `backend/src/index.ts` - Express app setup with CORS, routes, error handling
- `backend/prisma/schema.prisma` - Data models (Player, Event, Enrollment, Transaction)
- `frontend/src/App.tsx` - React Router setup
- `frontend/vite.config.ts` - API proxy to backend port 3001

## Backend Patterns
- **Controllers**: Export object with async methods (e.g., `eventsController.getAll`). Use `next(error)` for errors.
- **Services**: Pure business logic with Prisma client. Include relations in `include` for joins.
- **Error Handling**: Use `createError(message, statusCode)` from `errorHandler.ts` for operational errors.
- **API Responses**: Always return `{ success: boolean, data: T }` format.
- **Filters**: Query params parsed into typed filters (see `EventFilters` in `types/index.ts`).

Example controller method:
```typescript
async getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = parseFilters(req.query);
    const data = await service.findAll(filters);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
```

## Frontend Patterns
- **Hooks**: Custom hooks (e.g., `useEvents`) manage state and API calls. Update local state optimistically after mutations.
- **API Service**: Axios instance with `/api` baseURL. Convert dates to ISO strings for POST/PUT.
- **Components**: Use MUI components. Event forms use `EventFormData` type with Day.js dates.
- **Routing**: Simple React Router setup in `App.tsx`.

## Development Workflow
- **Setup**: `cd backend && npm install && cp .env.example .env` then `npm run db:generate && npm run db:migrate`
- **Run**: Backend `npm run dev` (port 3001), Frontend `npm run dev` (port 5173, proxies /api)
- **Database**: Use `npm run db:studio` for Prisma Studio. Run `npm run db:migrate` after schema changes.
- **Build**: Backend `npm run build` (TypeScript), Frontend `npm run build` (Vite)

## Data Model Notes
- Enums: `EventType`, `SkillLevel`, `GenderCategory`, etc. - use Prisma-generated types.
- Relations: Events have enrollments with players; players have transactions and enrollments.
- Credits: Players have `classCredits` and `dropInCredits` for tracking.

## Conventions
- **Imports**: Relative paths with `.js` extensions for TypeScript (e.g., `import routes from './routes/index.js'`)
- **Types**: Re-export Prisma types from `types/index.ts`. Define interfaces for filters/responses.
- **Naming**: camelCase for JS/TS, PascalCase for components. Use plural for arrays (events, players).
- **No Tests Yet**: Focus on manual testing via API endpoints and UI.

## Common Tasks
- **Add Event Filter**: Update `EventFilters` interface, parse in controller, add to Prisma `where` clause.
- **New API Endpoint**: Add route in `routes/`, controller method, service logic, update frontend API service and hook.
- **Database Change**: Modify `schema.prisma`, run `npm run db:migrate`, regenerate types with `npm run db:generate`.</content>
<parameter name="filePath">/Users/deannamostowfi/code/personal/qbk-manager/.github/copilot-instructions.md