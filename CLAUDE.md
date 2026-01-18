# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PLAB 2 Practice Platform - A full-stack real-time collaborative application for medical professionals preparing for the PLAB 2 exam. Features synchronized practice sessions with WebSocket communication, role-based interactions (Doctor, Patient, Observer), and medical case management.

**Live URLs:**
- Frontend: https://plab2practice.com (Vercel)
- Backend: https://plab2project-backend.onrender.com (Render)

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Material-UI + Redux Toolkit + Tailwind CSS
- **Backend:** Spring Boot 3.2.1 + Java 21 + Spring Security + Spring WebSocket (STOMP)
- **Database:** PostgreSQL (production), H2 (testing)
- **Auth:** JWT + Google OAuth

## Common Commands

### Frontend (`/frontend`)
```bash
npm run dev          # Start dev server (port 3000)
npm run build        # TypeScript compile + production build
npm run lint         # ESLint check
npm run test         # Jest tests
npm run preview      # Preview production build
```

### Backend (`/backend`)
```bash
./gradlew bootRun --args='--spring.profiles.active=dev'   # Dev server (port 8080)
./gradlew build      # Build JAR
./gradlew test       # Run tests
./gradlew bootJar    # Production JAR
```

### Full Stack
```bash
docker-compose up    # Start PostgreSQL + Backend containers
```

## Architecture

### Backend Structure (`/backend/src/main/java/com/plabpractice/api/`)
- `controller/` - REST endpoints: AuthController, SessionController, CaseController, FeedbackController, WebSocketController
- `model/` - JPA entities: User, Session, SessionParticipant, Case, Category, Feedback
- `repository/` - Spring Data JPA repositories
- `service/` - Business logic: SessionService, SessionWebSocketService, FeedbackService, EmailService
- `security/` - JWT auth: JwtTokenProvider, JwtAuthenticationFilter, WebSecurityConfig
- `config/` - WebSocketConfig, RateLimitConfig (Bucket4j), WebConfig

### Frontend Structure (`/frontend/src/`)
- `components/auth/` - Login, Register, Profile, PrivateRoute, AdminRoute
- `components/session/` - SessionRoom, ConfigureSession, RoleSelection, SessionJoin
- `components/admin/` - AdminPanel, CaseEditor, UserManagement
- `features/` - Redux slices: authSlice, sessionSlice, adminSlice
- `services/api.ts` - Axios + WebSocket client with JWT interceptors

### Key Patterns
- **Real-time:** STOMP WebSocket on `/ws`, subscriptions to `/topic/session/{code}`
- **Auth flow:** JWT in Authorization header, refresh via interceptor
- **State:** Redux Toolkit with async thunks for API calls
- **API proxy:** Vite proxies `/api` and `/ws` to backend in dev

## Configuration

### Backend Profiles
- `application.properties` - Base config
- `application-dev.properties` - Local PostgreSQL (localhost:5432/plabdb)
- `application-prod.properties` - Production (env vars)

### Key Environment Variables
```
DATABASE_URL, DATABASE_USERNAME, DATABASE_PASSWORD
JWT_SECRET (min 32 chars), JWT_EXPIRATION
CORS_ALLOWED_ORIGINS
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (optional)
```

### Frontend Env
```
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=http://localhost:8080/ws
```

## Database

- **ORM:** Spring Data JPA with Hibernate
- **Migrations:** Flyway (`/backend/src/main/resources/db/migration/`)
- **Connection Pool:** HikariCP (3-4 connections, optimized for managed DBs)

## Session Flow

1. Create session → Configure timing/categories
2. Join with role (Doctor/Patient/Observer)
3. Phases: WAITING → READING → CONSULTATION → FEEDBACK → COMPLETED
4. WebSocket messages sync state: SESSION_UPDATE, PHASE_CHANGE, TIMER_START

## API Endpoints

- Auth: `POST /api/auth/login`, `/register`, `/google-oauth`
- Sessions: `POST /api/sessions`, `/api/sessions/join`, `/api/sessions/{code}/start`
- Cases: `GET /api/cases`, `/api/cases/by-category/{id}`, `/api/cases/random`
- Feedback: `POST /api/feedback/submit`, `GET /api/feedback/session/{code}`
