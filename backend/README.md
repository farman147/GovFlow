# GovFlow Backend

Production-oriented API for government service queues, appointments, counters, and operational dashboards. It uses Express, MongoDB/Mongoose, JWT authentication, and Socket.IO. The architecture keeps HTTP concerns in controllers, queue rules in `services/queueService.js`, and leaves `services/ai/` free for future AI capabilities.

## Setup

```bash
cd backend
npm install
copy .env.example .env
# Set MONGODB_URI and a strong JWT_SECRET in .env
npm run seed
npm run dev
```

The development seed creates `admin@govflow.com`; its password is the `SEED_ADMIN_PASSWORD` value in your private `.env`. Sample staff use `SEED_STAFF_PASSWORD` (or the admin password if omitted). Never commit `.env`.

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random JWT signing secret |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_URL` | Comma-separated permitted browser origins |
| `SEED_ADMIN_PASSWORD` | Development-only admin password |
| `SEED_STAFF_PASSWORD` | Development-only staff password |

## Authentication and roles

Register/login responses return a bearer JWT. Send it as `Authorization: Bearer <token>`. Public registration creates citizens only; include a valid admin bearer token to create `staff` or `admin` accounts. Citizens manage their own appointments/tokens, staff manage only assigned counters, and admins have full operational control.

## API endpoints

All API responses use `{ success, message, data }`; errors use `{ success: false, message }`.

| Area | Endpoints |
| --- | --- |
| Health | `GET /` |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `GET/PUT /api/auth/profile` |
| Services | `GET /api/services`, `GET /api/services/:id`, `POST/PUT/DELETE /api/services/:id` (admin writes) |
| Tokens | `POST /api/tokens`, `GET /api/tokens/my`, `GET /api/tokens/:id`, `GET /api/tokens/:id/status`, `GET /api/tokens/queue/:serviceId`, `POST /api/tokens/:id/call`, `/start`, `/complete`, `/skip`, `/cancel` |
| Queue convenience | `POST /api/tokens/queue/:serviceId/call-next` |
| Counters | `GET /api/counters`, `GET /api/counters/:id`, `POST/PUT /api/counters/:id`, `POST /api/counters/:id/assign`, `POST /api/counters/:id/status` |
| Appointments | `POST /api/appointments`, `GET /api/appointments/my`, `GET /api/appointments/:id`, `PUT /api/appointments/:id/cancel`, `POST /api/appointments/:id/check-in` |
| Admin | `GET /api/admin/dashboard`, `GET /api/admin/services/:id/statistics` |

For call operations send `{ "counterId": "..." }`. `call-next` takes the service in the URL and the same body. Token creation accepts `{ "serviceId": "...", "priority": "normal", "notes": "..." }`. Priority is limited to `normal` or `priority`.

## Queue and appointment flow

Token numbers use the service code plus a daily sequence (for example `RTO-001`), resetting for each service each UTC calendar day. A unique compound index and retry-on-conflict protect issuance when concurrent requests arrive. Queue order is priority first, then issuance time—not token number. The lifecycle is `waiting → called → in_service → completed`; skips/cancellation are restricted to valid source states.

Appointment check-in is available only on the appointment date and creates the token: appointment → check-in → token → queue → counter → service. Walk-ins create a token directly.

## Socket.IO

Clients emit `joinServiceQueue` with a service ID to join `service:<serviceId>`. They receive `queueUpdated`, `tokenCalled`, `tokenStarted`, `tokenCompleted`, and `tokenSkipped`. Emit `leaveServiceQueue` when no longer watching.

## Quick test

1. Start MongoDB and configure `.env`, then run `npm run seed` and `npm run dev`.
2. `POST /api/auth/login` with the seeded admin credentials; save the bearer token.
3. `GET /api/services` to select a service ID, or create one as admin.
4. Register a citizen, log in as that citizen, and `POST /api/tokens`.
5. Log in as the staff assigned to the selected counter. Call the token, then start and complete it.
6. As the citizen, request `GET /api/tokens/:id/status` and watch Socket.IO events from the service room.
7. Create an appointment for today and call its check-in endpoint to verify the appointment path.
