# PLAB 2 Practice Platform

A collaborative web application for doctors preparing for the PLAB 2 exam. The platform enables real-time practice sessions with peers, focusing on communication skills and clinical scenarios.

## Features

- User authentication with JWT
- Real-time collaboration using WebSocket
- Role-based practice sessions (Doctor, Patient, Examiner)
- Live feedback system
- Session history and performance tracking
- Admin panel for managing cases and categories

## Tech Stack

### Frontend

- React with TypeScript
- Material-UI for styling
- Redux Toolkit for state management
- WebSocket for real-time communication
- Vite for build tooling

### Backend

- Spring Boot
- Spring Security with JWT
- Spring WebSocket
- PostgreSQL database
- JPA/Hibernate

## Prerequisites

- Node.js (v16 or later)
- Java 17
- PostgreSQL 12 or later
- Maven or Gradle

## Setup Instructions

### Database Setup

1. Install PostgreSQL if not already installed
2. Navigate to the backend directory:
   ```bash
   cd backend
   ```
3. Run the database setup script:
   ```bash
   ./setup-db.sh
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Build the project:
   ```bash
   ./gradlew build
   ```
3. Run the application:
   ```bash
   ./gradlew bootRun
   ```
   The backend will start on http://localhost:8080

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will start on http://localhost:5173

## Usage

1. Register a new account or login with existing credentials
2. Create a new practice session or join an existing one
3. Select your role in the session (Doctor, Patient, or Examiner)
4. Participate in the session with real-time communication
5. Provide or receive feedback based on your role

## Development

### API Documentation

The API documentation is available at http://localhost:8080/swagger-ui.html when the backend is running.

### WebSocket Endpoints

- Main endpoint: `/ws`
- Session updates: `/topic/session/{sessionCode}/participants`
- Session messages: `/topic/session/{sessionCode}/messages`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
