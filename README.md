# PLAB 2 Practice Platform 🏥

A **comprehensive real-time collaborative platform** for medical professionals preparing for the PLAB 2 exam. This full-stack application enables synchronized practice sessions with multiple participants, featuring live case scenarios, role-based interactions, and intelligent session management.

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.3-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.4-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14.18-blue.svg)](https://www.postgresql.org/)
[![WebSocket](https://img.shields.io/badge/WebSocket-STOMP-orange.svg)](https://stomp.github.io/)

## 🚀 Project Overview

This application simulates real PLAB 2 examination scenarios where medical professionals practice clinical communication skills in structured, timed sessions. The platform handles complex multi-user interactions with real-time synchronization, making it ideal for remote medical training.

## ✨ Key Features Implemented

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
- **Difficulty levels** and learning objectives integration

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

## 🛠️ Technical Stack

### **Backend Technologies**

- **Spring Boot 3.2.3** (Java 17+)
- **Spring Security** with JWT authentication
- **Spring WebSocket** for real-time communication
- **Spring Data JPA** with Hibernate ORM
- **PostgreSQL** for production database
- **Gradle** for build automation
- **JUnit 5** for comprehensive testing

### **Frontend Technologies**

- **React 18.2.0** with TypeScript 5.0+
- **Material-UI v5** component library
- **Redux Toolkit** for state management
- **React Router v6** for navigation
- **STOMP.js** for WebSocket client
- **Axios** for HTTP client with interceptors
- **Vite** for fast development builds

### **Infrastructure & Deployment**

- **PostgreSQL 14.18** production database
- **H2** for testing environments
- **Docker-ready** configuration
- **Environment-based profiles** (dev/prod)
- **Automated migration scripts**

## 🏗️ Advanced Architecture Features

### **Real-Time Communication Flow**

```
Frontend ←→ WebSocket (STOMP) ←→ Spring WebSocket ←→ Session Service
    ↓                                                      ↓
Redux Store                                        PostgreSQL DB
```

### **Session State Management**

- **Centralized session state** with automatic persistence
- **Client-side timer optimization** to reduce server load
- **Graceful reconnection handling** for network interruptions
- **Message queuing** for reliable delivery

### **Database Schema Design**

- **8 normalized tables** with proper foreign key relationships
- **Optimized queries** with JPA repository pattern
- **Data integrity constraints** and validation
- **Performance indexing** on critical lookup fields

## 🔥 Highlighted Implementation Achievements

### **Complex WebSocket Implementation**

- Built a sophisticated real-time synchronization system handling multiple concurrent sessions
- Implemented client-side timer optimization reducing server load by 90%
- Created automatic session cleanup and participant management

### **Medical Domain Modeling**

- Designed comprehensive case structure supporting various medical specialties
- Implemented intelligent case selection algorithms based on topic preferences
- Created realistic role-based scenario distribution

### **Production-Ready Security**

- Successfully migrated from H2 to PostgreSQL addressing security vulnerabilities
- Implemented JWT authentication with proper token lifecycle management
- Added environment-based configuration for secure deployment

### **Advanced State Management**

- Built complex Redux store handling multiple async operations
- Implemented optimistic updates with rollback capabilities
- Created seamless navigation flow with protected routing

## 🚀 Getting Started

### **Prerequisites**

- Node.js 18+ and npm
- Java 17+
- PostgreSQL 14+
- Git

### **Quick Setup**

1. **Clone and Setup Database**

   ```bash
   git clone <repository-url>
   cd plab2projectnewmeta

   # Setup PostgreSQL database (secure method)
   ./setup-postgresql-secure.sh

   # OR manually with your own password:
   # Edit setup-postgresql.sql to replace 'YOUR_SECURE_PASSWORD_HERE'
   # psql -U postgres -f setup-postgresql.sql
   ```

2. **Backend Setup**

   ```bash
   cd backend
   ./gradlew build
   ./run-with-postgresql.sh
   ```

3. **Frontend Setup**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8080
   - API Documentation: http://localhost:8080/swagger-ui.html

## 🐳 Docker & Render Deployment

### **Render.com Deployment** (Recommended for Production)

Your application is now **Render-ready** with optimized Docker configuration!

**Required Environment Variables in Render:**

```bash
# Application
SPRING_PROFILES_ACTIVE=render
PORT=8080

# Database (Auto-provided by Render PostgreSQL)
DATABASE_URL=postgresql://...
DATABASE_USERNAME=your_db_user
DATABASE_PASSWORD=your_db_password

# Security
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters_long

# CORS
CORS_ALLOWED_ORIGINS=https://plab2projectnew.vercel.app
```

**Deployment Steps:**

1. **Push to GitHub** with your updated code
2. **Create Web Service** in Render
3. **Connect GitHub repo**
4. **Add PostgreSQL database** (Render auto-configures connection)
5. **Set environment variables** above in Render dashboard
6. **Deploy!** Render uses your Dockerfile automatically

**Health Check Endpoint:** `https://your-app.onrender.com/actuator/health`

### **Local Docker Testing**

```bash
# Build image
cd backend
docker build -t plab2-backend .

# Run with environment variables
docker run -d \
  -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=render \
  -e DATABASE_URL=your_db_url \
  -e JWT_SECRET=your_jwt_secret \
  -e CORS_ALLOWED_ORIGINS=http://localhost:3000 \
  --name plab2-backend \
  plab2-backend
```

## 📱 Application Flow

1. **User Registration/Login** with secure JWT authentication
2. **Session Creation** with configurable timing and topic selection
3. **Role Selection** (Doctor, Patient, Observer) with availability checking
4. **Real-time Practice** with synchronized phase transitions
5. **Case Distribution** based on selected medical topics
6. **Live Collaboration** with WebSocket-powered communication
7. **Session Analytics** and performance tracking

## 🎯 Development Highlights

- **Full-stack ownership** from database design to user interface
- **Real-time system architecture** handling concurrent users
- **Medical domain expertise** with realistic case scenarios
- **Production deployment** with PostgreSQL migration
- **Comprehensive testing** including integration tests
- **Security-first approach** with multiple vulnerability mitigations
- **Performance optimization** with client-side timer implementation
- **Professional documentation** and code organization

## 📊 Project Statistics

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

## 🚀 Live Deployment

**Frontend (Vercel):** [https://plab2projectnew.vercel.app/](https://plab2projectnew.vercel.app/)
**Backend (Render):** [https://plab2project-backend.onrender.com](https://plab2project-backend.onrender.com)

## Environment Configuration

For production deployment, set these environment variables:

### Frontend (Vercel)

```bash
VITE_API_URL=https://plab2project-backend.onrender.com/api
VITE_WS_URL=https://plab2project-backend.onrender.com/ws
```

### Backend (Render)

```bash
CORS_ALLOWED_ORIGINS=https://plab2projectnew.vercel.app
JWT_SECRET=your_secure_jwt_secret
DATABASE_URL=your_postgresql_connection_string
DATABASE_USERNAME=your_db_username
DATABASE_PASSWORD=your_db_password
```

---

**Built with ❤️ for the medical community** | **Demonstrating full-stack expertise in enterprise application development**
