import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SessionRole = 'doctor' | 'patient' | 'observer';
export type SessionPhase = 'waiting' | 'reading' | 'consultation' | 'feedback' | 'completed';

interface Participant {
  userId: string;
  username: string;
  role: SessionRole;
}

interface SessionCase {
  id: string;
  title: string;
  category: string;
  doctorNotes: string;
  patientNotes: string;
}

interface SessionSettings {
  type: 'topic' | 'recall';
  categories: string[];
  readingTime: number;
  consultationTime: number;
}

interface Feedback {
  fromUserId: string;
  toUserId: string;
  comment: string;
  score: number;
  timestamp: string;
}

interface SessionState {
  currentSession: {
    id: string;
    participants: Participant[];
    case: SessionCase | null;
    settings: SessionSettings;
    phase: SessionPhase;
    feedback: Feedback[];
    timeRemaining: number;
  } | null;
  selectedRole: SessionRole | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: SessionState = {
  currentSession: null,
  selectedRole: null,
  isLoading: false,
  error: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<SessionState['currentSession']>) => {
      state.currentSession = action.payload;
      state.error = null;
    },
    updateParticipants: (state, action: PayloadAction<Participant[]>) => {
      if (state.currentSession) {
        state.currentSession.participants = action.payload;
      }
    },
    setPhase: (state, action: PayloadAction<SessionPhase>) => {
      if (state.currentSession) {
        state.currentSession.phase = action.payload;
      }
    },
    updateTimeRemaining: (state, action: PayloadAction<number>) => {
      if (state.currentSession) {
        state.currentSession.timeRemaining = action.payload;
      }
    },
    addFeedback: (state, action: PayloadAction<Feedback>) => {
      if (state.currentSession) {
        state.currentSession.feedback.push(action.payload);
      }
    },
    setSelectedRole: (state, action: PayloadAction<SessionRole>) => {
      state.selectedRole = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearSession: (state) => {
      state.currentSession = null;
      state.selectedRole = null;
      state.error = null;
    },
  },
});

export const {
  setSession,
  updateParticipants,
  setPhase,
  updateTimeRemaining,
  addFeedback,
  setSelectedRole,
  setError,
  clearSession,
} = sessionSlice.actions;

export default sessionSlice.reducer; 