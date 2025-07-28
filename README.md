# PLAB 2 Practice Platform 🏥

A **comprehensive real-time collaborative platform** for medical professionals preparing for the PLAB 2 exam. This full-stack application enables synchronized practice sessions with multiple participants, featuring live case scenarios, role-based interactions, and intelligent session management.

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.1-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.4-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14.18-blue.svg)](https://www.postgresql.org/)
[![WebSocket](https://img.shields.io/badge/WebSocket-STOMP-orange.svg)](https://stomp.github.io/)

## 🚀 Project Overview

This application simulates real PLAB 2 examination scenarios where medical professionals practice clinical communication skills in structured, timed sessions. The platform handles complex multi-user interactions with real-time synchronization, making it ideal for remote medical training and examination preparation.

### Key Highlights

- **Real-time collaborative sessions** with synchronized timers
- **Role-based learning** (Doctor, Patient, Observer)
- **Comprehensive medical case database** across multiple specialties
- **WebSocket-powered live communication**
- **JWT-secured authentication** with role-based access control
- **Production-ready deployment** on Vercel and Render

## ✨ Key Features

### 🔄 **Real-Time Collaboration Engine**

- **WebSocket-based synchronization** using STOMP protocol
- **Live phase transitions** synchronized across all participants
- **Real-time participant tracking** with join/leave notifications
- **Synchronized countdown timers** with client-side optimization
- **Instant case data distribution** to all session participants

### 👥 **Advanced Role Management**

- **Doctor Role**: Leads sessions, controls case flow, can skip phases
- **Patient Role**: Receives case scenarios, participates in consultations
- **Observer Role**: Monitors sessions for learning/assessment purposes
- **Smart role restrictions** preventing conflicts (one Doctor/Patient per session)
- **Dynamic role assignment** with real-time availability checking

### 📋 **Medical Case Database**

- **Comprehensive case library** across multiple medical specialties
- **Categorized scenarios** (Cardiology, Respiratory, Neurology, etc.)
- **Topic-based filtering** and random case selection
- **Detailed role instructions** for realistic practice scenarios
- **Visual aids support** with image uploads for enhanced cases

### ⏱️ **Intelligent Session Management**

- **Multi-phase workflow**: Waiting → Reading → Consultation → Feedback → Completed
- **Configurable timing** (1-5 min reading, 5-15 min consultation)
- **Auto-progression** with timer expiry or manual phase skipping
- **Session persistence** with PostgreSQL backend
- **Graceful session termination** on insufficient participants

### 🔐 **Enterprise-Grade Security**

- **JWT-based authentication** with secure token management
- **Role-based access control** (USER/ADMIN permissions)
- **Protected API endpoints** with method-level security
- **CORS configuration** for production deployment
- **Password encryption** using BCrypt with salt rounds

### 🎨 **Modern Frontend Architecture**

- **React 18** with TypeScript for type safety
- **Material-UI (MUI)** for professional medical interface design
- **Redux Toolkit** for centralized state management
- **Formik + Yup** for robust form validation
- **Responsive design** optimized for various devices

## 🛠️ Tech Stack

### **Backend Technologies**

- **Spring Boot 3.2.1** (Java 17+)
- **Spring Security** with JWT authentication
- **Spring WebSocket** for real-time communication
- **Spring Data JPA** with Hibernate ORM
- **PostgreSQL** for production database
- **Gradle** for build automation
- **JUnit 5** for comprehensive testing

### **Frontend Technologies**

- **React 18.2.0** with TypeScript 5.0+
- **Material-UI (MUI) v5** component library
- **Redux Toolkit** for state management
- **React Router v6** for navigation
- **STOMP.js** for WebSocket client
- **Axios** for HTTP client with interceptors
- **Vite** for fast development builds
- **Tailwind CSS** for utility-first styling

### **Development & Deployment**

- **PostgreSQL 14.18** production database
- **H2 Database** for testing environments
- **Docker-ready** configuration
- **Environment-based profiles** (dev/prod/render)
- **Vercel** frontend deployment
- **Render** backend deployment

## 🏗️ Project Structure

```
plab2projectnewmeta/
├── frontend/                    # React TypeScript frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── auth/          # Authentication components
│   │   │   ├── common/        # Shared components
│   │   │   ├── dashboard/     # Dashboard components
│   │   │   ├── session/       # Session management
│   │   │   └── admin/         # Admin panel
│   │   ├── features/          # Redux slices
│   │   ├── services/          # API services
│   │   ├── store/             # Redux store configuration
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Utility functions
│   ├── package.json           # Frontend dependencies
│   └── vite.config.ts         # Vite configuration
├── backend/                    # Spring Boot backend
│   ├── src/main/java/com/plabpractice/api/
│   │   ├── config/            # Configuration classes
│   │   ├── controller/        # REST controllers
│   │   ├── dto/              # Data Transfer Objects
│   │   ├── model/            # JPA entities
│   │   ├── repository/       # Data repositories
│   │   ├── service/          # Business logic
│   │   ├── security/         # Security configuration
│   │   └── exception/        # Exception handling
│   ├── src/main/resources/
│   │   ├── application*.properties  # Configuration files
│   │   └── db/migration/     # Database migrations
│   ├── build.gradle.kts      # Build configuration
│   ├── setup-db.sh          # Database setup script
│   └── run-dev.sh           # Development run script
├── docs/                      # Documentation
├── docker-compose.yml        # Docker configuration
└── README.md                 # This file
```

## 🚀 Getting Started

### **Prerequisites**

- **Node.js 18+** and npm
- **Java 17+**
- **PostgreSQL 14+**
- **Git**

### **Quick Setup**

1. **Clone Repository**

   ```bash
   git clone <repository-url>
   cd plab2projectnewmeta
   ```

2. **Database Setup**

   ```bash
   # Setup PostgreSQL database
   cd backend
   chmod +x setup-db.sh
   ./setup-db.sh
   ```

   This script creates the required database, user, and permissions automatically.

3. **Backend Setup**

   ```bash
   cd backend
   ./gradlew build
   chmod +x run-dev.sh
   ./run-dev.sh
   ```

   Or manually:

   ```bash
   ./gradlew bootRun --args='--spring.profiles.active=dev'
   ```

4. **Frontend Setup**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Google OAuth Setup (Optional)**

   **Step 1: Get Google OAuth Credentials**

   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create a new project or select existing one
   - Enable Google+ API (or Identity API)
   - Create OAuth 2.0 Client ID credentials
   - Add your domains to authorized origins (e.g., `http://localhost:3000`)

   **Step 2: Frontend Configuration**
   Create a `.env` file in the `frontend/` directory:

   ```bash
   # Frontend environment variables
   VITE_API_URL=http://localhost:8080/api
   VITE_WS_URL=http://localhost:8080/ws
   VITE_GOOGLE_CLIENT_ID=your_actual_google_client_id
   ```

   **Step 3: Backend Configuration**

   ```bash
   # Backend (environment variables or application.properties)
   GOOGLE_OAUTH_ENABLED=true
   GOOGLE_CLIENT_ID=your_actual_google_client_id
   GOOGLE_CLIENT_SECRET=your_actual_google_client_secret
   ```

   **For development without Google OAuth:**

   ```bash
   # Backend - Mock mode (default)
   GOOGLE_OAUTH_ENABLED=false
   # Frontend - Leave VITE_GOOGLE_CLIENT_ID unset or empty
   ```

   **Important Notes:**

   - The Google Sign-In script is automatically loaded in `index.html`
   - Without proper configuration, users will see an error message directing them to use regular login
   - Mock mode allows testing authentication flow without Google setup

6. **Access Application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8080
   - **Health Check**: http://localhost:8080/actuator/health

## 📱 Usage

### **Application Flow**

1. **Registration/Login**: Create account or sign in with JWT authentication
2. **Session Creation**: Configure timing, select medical categories
3. **Role Selection**: Choose Doctor, Patient, or Observer role
4. **Real-time Practice**: Participate in synchronized sessions
5. **Case Studies**: Work through medical scenarios
6. **Feedback System**: Submit and review session feedback

### **Development Commands**

#### Frontend

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

#### Backend

```bash
./gradlew bootRun    # Run Spring Boot application
./gradlew build      # Build application
./gradlew test       # Run tests
./gradlew clean      # Clean build artifacts
```

## 🌐 API Documentation

### **Authentication Endpoints**

```
POST /api/auth/login          # User login
POST /api/auth/register       # User registration
POST /api/auth/google         # Google OAuth login
GET  /api/auth/ping          # Health check
```

#### **Google OAuth Integration**

The platform supports Google OAuth 2.0 authentication for seamless user login:

- **Real token verification** using Google's tokeninfo API
- **Automatic user creation** for new Google accounts
- **Account linking** for existing users
- **Secure audience validation** against configured client ID
- **Fallback to mock mode** for development environments

**Google OAuth Request:**

```json
POST /api/auth/google
Content-Type: application/json

{
  "idToken": "google_id_token_from_frontend"
}
```

**Response (Success):**

```json
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "provider": "GOOGLE",
    "googleId": "google_user_id"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid or expired Google ID token
- `500 Internal Server Error`: Google OAuth configuration error
- `400 Bad Request`: Other authentication failures

### **Session Management**

```
POST   /api/sessions                    # Create new session
GET    /api/sessions/{sessionCode}      # Get session details
POST   /api/sessions/join              # Join session by code
POST   /api/sessions/{sessionCode}/new-case    # Request new case
GET    /api/sessions/active            # Get active sessions
GET    /api/sessions/user/active       # Get user's active sessions
```

### **Case & Category Management**

```
GET    /api/categories                 # Get all categories
GET    /api/categories/{id}           # Get category by ID
POST   /api/categories               # Create category (Admin)

GET    /api/cases                     # Get all cases
GET    /api/cases/{id}               # Get case by ID
GET    /api/cases/by-category/{categoryId}  # Get cases by category
GET    /api/cases/random             # Get random case
POST   /api/cases                   # Create case (Admin)
```

### **Feedback System**

```
POST   /api/feedback/submit          # Submit session feedback
GET    /api/feedback/session/{sessionCode}  # Get session feedback
```

### **File Upload**

```
POST   /api/upload/image             # Upload case images
GET    /api/uploads/images/{filename} # Serve uploaded images
```

### **WebSocket Endpoints**

```
/ws                                  # WebSocket connection endpoint
/topic/session/{sessionId}           # Session broadcasts
/queue/user/{userId}                 # User-specific messages
```

## 🐳 Docker & Deployment

### **Docker Compose (Local Development)**

```bash
# Start with Docker Compose
docker-compose up -d

# Stop services
docker-compose down
```

### **Production Deployment**

#### **Frontend (Vercel)**

- **Live URL**: https://plab2projectnew.vercel.app/
- **Environment Variables**:
  ```bash
  VITE_API_URL=https://plab2project-backend.onrender.com/api
  VITE_WS_URL=https://plab2project-backend.onrender.com/ws
  VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
  ```

#### **Backend (Render)**

- **Live URL**: https://plab2project-backend.onrender.com
- **Environment Variables**:

  ```bash
  SPRING_PROFILES_ACTIVE=render
  DATABASE_URL=postgresql://...         # Provided by Render
  JWT_SECRET=your_secure_jwt_secret
  CORS_ALLOWED_ORIGINS=https://plab2projectnew.vercel.app

  # Google OAuth Configuration
  GOOGLE_OAUTH_ENABLED=true
  GOOGLE_CLIENT_ID=your_google_oauth_client_id
  GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
  ```

### **Environment Profiles**

- **Development** (`dev`): PostgreSQL with debug logging
- **Production** (`prod`): Environment variables, security enabled
- **Render** (`render`): Optimized for Render.com deployment

## 🎯 Advanced Features

### **Real-Time Timer Synchronization**

- **Perfect synchronization** across all participants
- **Client-side optimization** to reduce server load
- **Bulletproof reconnection** handling
- See [Timer Synchronization Architecture](docs/timer-synchronization-architecture.md)

### **Session State Management**

- **Persistent sessions** with PostgreSQL storage
- **Automatic cleanup** for abandoned sessions
- **Role validation** and participant management
- **Phase transition** controls with authorization

### **Security Implementation**

- **JWT tokens** with configurable expiration
- **BCrypt password** hashing with salt rounds
- **CORS configuration** for cross-origin security
- **Method-level** security annotations

## 🧪 Testing

### **Backend Testing**

```bash
./gradlew test                # Run all tests
./gradlew test --tests="*AuthController*"  # Specific tests
```

### **Frontend Testing**

```bash
npm run test                  # Run Jest tests
npm run test:watch            # Watch mode
```

## 📊 Key Statistics

- **25+ API endpoints** with comprehensive error handling
- **8 database tables** with optimized relationships
- **50+ React components** with TypeScript interfaces
- **Real-time WebSocket** handling unlimited concurrent sessions
- **JWT security** with role-based access control
- **Cross-platform compatibility** with responsive design

## 🔮 Future Enhancements

- [ ] Advanced analytics dashboard for performance tracking
- [ ] AI-powered feedback system for consultation quality
- [ ] Mobile application for iOS/Android
- [ ] Video/audio integration for realistic consultations
- [ ] Multi-language support for international users
- [ ] Recall case functionality for spaced repetition learning

## 📚 Additional Documentation

- [Technical Architecture](TECH_STACK_DOCUMENTATION.md) - Detailed technical implementation
- [App Specification](plab_2_app_specification.md) - Feature requirements and constraints
- [Timer Synchronization](docs/timer-synchronization-architecture.md) - Real-time sync architecture

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**

- Follow TypeScript best practices
- Write comprehensive tests
- Use conventional commit messages
- Ensure responsive design compatibility
- Follow Material-UI design patterns

## 📄 License

This project is proprietary software for medical education purposes.

## 📞 Contact

For questions, support, or collaboration opportunities, please contact the development team.

---

**Built with ❤️ for the medical community** | **Demonstrating full-stack expertise in enterprise application development**
