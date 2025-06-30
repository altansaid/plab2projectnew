# PLAB 2 Practice Platform - Technical Documentation

## 🏗️ Architecture Overview

This is a full-stack collaborative web application for medical professionals preparing for the PLAB 2 exam. The platform enables real-time clinical skills practice sessions with multiple participants.

## 🎯 Core Features

### Authentication & Authorization

- **JWT-based authentication** with persistent login
- **Role-based access control** (USER/ADMIN)
- **Protected routing** with automatic redirects
- **Session storage** for post-login navigation flow
- **Auto-login persistence** using localStorage

### Real-time Collaboration

- **WebSocket communication** using STOMP protocol
- **Multi-participant sessions** (Doctor, Patient, Observer roles)
- **Real-time messaging** and state synchronization
- **Session management** with unique join codes

### User Experience

- **Landing page first** approach (no forced login)
- **Responsive Material Design** UI
- **Progressive authentication** (login only when needed)
- **Seamless navigation** flow
- **Form validation** with real-time feedback

## 🚀 Frontend Technologies

### Core Framework

- **React 18** with **TypeScript** for type safety
- **Vite** as build tool and development server
- **ES6+ JavaScript** with modern syntax

### UI & Styling

- **Material-UI (MUI) v5** for component library
- **Material Icons** for consistent iconography
- **Responsive Grid System** for mobile-first design
- **Theme customization** with MUI theming

### State Management

- **Redux Toolkit** for centralized state management
- **React-Redux** for component-store connection
- **Redux Slices** for feature-based state organization
- **Async actions** with createAsyncThunk

### Routing & Navigation

- **React Router v6** for client-side routing
- **Protected Routes** with authentication guards
- **Admin Routes** with role-based access
- **Programmatic navigation** with useNavigate hook

### Forms & Validation

- **Formik** for form state management
- **Yup** for schema validation
- **Real-time validation** with error feedback
- **Disabled states** during form submission

### HTTP & WebSocket Communication

- **Axios** for HTTP requests with interceptors
- **STOMP.js** for WebSocket client implementation
- **SockJS** for WebSocket fallback support
- **Automatic reconnection** handling

## 🔧 Backend Technologies

### Core Framework

- **Spring Boot 3.x** (Java 17+)
- **Spring Web MVC** for REST API
- **Spring Data JPA** for database operations
- **Hibernate** as ORM implementation

### Security

- **Spring Security** for authentication/authorization
- **JWT (JSON Web Tokens)** for stateless authentication
- **BCrypt** for password hashing
- **CORS configuration** for cross-origin requests
- **Method-level security** with annotations

### Real-time Communication

- **Spring WebSocket** for WebSocket support
- **STOMP messaging** for pub/sub communication
- **Message brokers** for session management
- **WebSocket security** integration

### Database

- **PostgreSQL** as primary database
- **H2 Database** for testing environment
- **JPA Repositories** for data access
- **Database migrations** with Flyway/Liquibase support

### Build & Testing

- **Gradle** as build automation tool
- **JUnit 5** for unit testing
- **Spring Boot Test** for integration testing
- **Testcontainers** for database testing

## 📁 Project Structure

### Frontend Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── auth/           # Authentication components
│   │   ├── common/         # Shared components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── session/        # Session management
│   │   └── admin/          # Admin panel
│   ├── features/           # Redux slices
│   │   ├── auth/          # Authentication state
│   │   ├── session/       # Session state
│   │   └── admin/         # Admin state
│   ├── services/          # API services
│   ├── store/             # Redux store configuration
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── public/                # Static assets
└── package.json          # Dependencies and scripts
```

### Backend Structure

```
backend/
├── src/main/java/com/plabpractice/api/
│   ├── config/            # Configuration classes
│   ├── controller/        # REST controllers
│   ├── dto/              # Data Transfer Objects
│   ├── model/            # JPA entities
│   ├── repository/       # Data repositories
│   ├── service/          # Business logic
│   ├── security/         # Security configuration
│   └── exception/        # Exception handling
├── src/main/resources/
│   ├── application.properties  # App configuration
│   └── data.sql              # Initial data
└── build.gradle.kts          # Build configuration
```

## 🔐 Security Implementation

### JWT Authentication Flow

1. User submits credentials to `/api/auth/login`
2. Server validates credentials and generates JWT
3. JWT stored in localStorage on client
4. JWT sent in Authorization header for protected requests
5. Server validates JWT on each protected endpoint

### Password Security

- **BCrypt hashing** with salt rounds
- **Password strength validation** on frontend
- **Secure password storage** (never plain text)

### CORS Configuration

- **Allowed origins** configuration
- **Credentials support** for cookies/auth headers
- **Preflight request** handling

## 🌐 API Design

### REST Endpoints

```
Authentication:
POST /api/auth/login      # User login
POST /api/auth/register   # User registration

Sessions:
GET    /api/sessions           # List user sessions
POST   /api/sessions           # Create new session
GET    /api/sessions/{id}      # Get session details
PUT    /api/sessions/{id}      # Update session
DELETE /api/sessions/{id}      # Delete session
POST   /api/sessions/{id}/join # Join session

Users:
GET    /api/users/profile      # Get user profile
PUT    /api/users/profile      # Update profile

Admin:
GET    /api/admin/users        # List all users
GET    /api/admin/sessions     # List all sessions
```

### WebSocket Endpoints

```
/ws/session/{sessionId}        # Session-specific communication
/topic/session/{sessionId}     # Session broadcasts
/queue/user/{userId}           # User-specific messages
```

## 📊 Database Schema

### Key Entities

- **User**: Authentication and profile data
- **Session**: Practice session information
- **SessionParticipant**: User-session relationships with roles
- **Case**: Clinical scenarios and cases
- **Category**: Case categorization
- **Feedback**: Session feedback and ratings

### Relationships

- User ↔ SessionParticipant (One-to-Many)
- Session ↔ SessionParticipant (One-to-Many)
- Case ↔ Category (Many-to-One)
- Session ↔ Case (Many-to-One)

## 🎨 UI/UX Design Patterns

### Material Design Implementation

- **Consistent spacing** using MUI theme
- **Color palette** with primary/secondary colors
- **Typography scale** for hierarchy
- **Elevation system** for depth
- **Animation transitions** for smooth interactions

### Responsive Design

- **Mobile-first** approach
- **Breakpoint system** (xs, sm, md, lg, xl)
- **Flexible grid layouts**
- **Touch-friendly** interface elements

### User Flow Patterns

- **Progressive disclosure** (show features when needed)
- **Contextual actions** (relevant buttons/options)
- **Clear navigation** hierarchy
- **Feedback mechanisms** (loading states, success/error messages)

## 🔄 State Management Patterns

### Redux Architecture

```javascript
// Auth Slice
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// Session Slice
interface SessionState {
  currentSession: Session | null;
  sessions: Session[];
  participants: SessionParticipant[];
  isLoading: boolean;
  error: string | null;
}
```

### Data Flow

1. **Component** dispatches action
2. **Action** triggers async thunk (API call)
3. **Reducer** updates state based on action
4. **Component** re-renders with new state

## 🧪 Testing Strategy

### Frontend Testing

- **Unit tests** for utility functions
- **Component tests** with React Testing Library
- **Integration tests** for user flows
- **E2E tests** with Cypress (planned)

### Backend Testing

- **Unit tests** for service layer
- **Integration tests** for repositories
- **Controller tests** with MockMvc
- **Security tests** for authentication

## 🚀 Deployment & DevOps

### Development Environment

- **Hot reload** with Vite dev server
- **Proxy configuration** for API calls
- **Environment variables** for configuration
- **Docker support** for consistent environments

### Production Considerations

- **Build optimization** with Vite
- **Code splitting** for better performance
- **Asset optimization** (images, fonts)
- **CDN integration** for static assets

## 📈 Performance Optimizations

### Frontend

- **Code splitting** with React.lazy
- **Memoization** with React.memo and useMemo
- **Virtual scrolling** for large lists
- **Image optimization** and lazy loading

### Backend

- **Database indexing** for query optimization
- **Connection pooling** for database connections
- **Caching strategies** with Redis (planned)
- **Pagination** for large datasets

## 🔧 Development Tools

### Code Quality

- **ESLint** for JavaScript/TypeScript linting
- **Prettier** for code formatting
- **Husky** for git hooks
- **TypeScript** for type checking

### Build Tools

- **Vite** for fast development and building
- **Gradle** for Java build automation
- **npm/yarn** for package management

## 🌟 Key Implementation Highlights

### Authentication Flow Innovation

- **Landing page first** approach instead of forced login
- **Intent preservation** using sessionStorage
- **Seamless redirect** after authentication
- **Persistent login** with localStorage

### Real-time Collaboration

- **STOMP over WebSocket** for reliable messaging
- **Role-based participation** in sessions
- **State synchronization** across participants
- **Connection management** with reconnection logic

### User Experience Excellence

- **Progressive authentication** (authenticate when needed)
- **Responsive design** with mobile-first approach
- **Consistent Material Design** implementation
- **Intuitive navigation** with clear user flows

This technical documentation serves as a comprehensive reference for understanding the platform's architecture, technologies, and implementation decisions. It can be used for future development, maintenance, and scaling decisions.
