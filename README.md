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


### **Application Flow**

1. **Registration/Login**: Create account or sign in with JWT authentication
2. **Session Creation**: Configure timing, select medical categories
3. **Role Selection**: Choose Doctor, Patient, or Observer role
4. **Real-time Practice**: Participate in synchronized sessions
5. **Case Studies**: Work through medical scenarios
6. **Feedback System**: Submit and review session feedback



