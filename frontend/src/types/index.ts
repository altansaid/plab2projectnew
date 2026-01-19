export interface User {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  provider?: 'LOCAL' | 'GOOGLE';
  googleId?: string;
  supabaseId?: string;
  migratedToSupabase?: boolean;
  createdAt?: string;
}

export interface Case {
  id: number;
  title: string;
  description: string;
  doctorInstructions?: string;
  patientInstructions?: string;
  observerInstructions?: string;
  imageUrl?: string;
  category?: Category;
}

export interface Category {
  id: number;
  name: string;
}

export interface Session {
  id: number;
  title: string;
  description?: string;
  joinCode: string;
  status: 'WAITING' | 'READING' | 'CONSULTATION' | 'FEEDBACK' | 'COMPLETED';
  currentPhase: 'WAITING' | 'READING' | 'CONSULTATION' | 'FEEDBACK' | 'COMPLETED';
  maxParticipants: number;
  readingTimeMinutes: number;
  consultationTimeMinutes: number;
  currentCase?: Case;
  participants: SessionParticipant[];
  phaseStartTime?: string;
  phaseEndTime?: string;
  canSkipPhase: boolean;
}

export interface SessionParticipant {
  id: number;
  user: User;
  role: 'DOCTOR' | 'PATIENT' | 'OBSERVER';
  joinedAt: string;
}

export interface SessionMessage {
  id: string;
  sessionId: number;
  message: string;
  timestamp: string;
  sender: string;
  type: 'CHAT' | 'SYSTEM' | 'PHASE_CHANGE' | 'USER_JOINED' | 'USER_LEFT';
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SessionCreateRequest {
  title: string;
  description?: string;
  maxParticipants: number;
  readingTimeMinutes: number;
  consultationTimeMinutes: number;
  caseId?: number;
}

export interface JoinSessionRequest {
  joinCode: string;
  role: 'DOCTOR' | 'PATIENT' | 'OBSERVER';
}