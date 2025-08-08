import axios from 'axios';
import { Client } from '@stomp/stompjs';
import { store } from '../store';
import { logout } from '../features/auth/authSlice';

// Environment-based API URLs
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';

// Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.token;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
      (error) => {
      return Promise.reject(error);
    }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => {
    return response;
  },
      (error) => {
      const status = error?.response?.status;
      if (status === 401) {
        try {
          store.dispatch(logout());
        } catch {}
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
);

// WebSocket client
let stompClient: Client | null = null;

// Connection state tracking
let isConnecting = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

export const connectWebSocket = (sessionCode: string, handlers: {
  onSessionUpdate?: (data: any) => void;
  onParticipantUpdate?: (participants: any[]) => void;
  onPhaseChange?: (data: any) => void;
  onTimerStart?: (data: any) => void;
  onMessage?: (message: any) => void;
  onSessionEnded?: (data: any) => void;
  onUserLeft?: (data: any) => void;
  onRoleChange?: (data: any) => void;
  onTopicSelectionNeeded?: (data: any) => void;
}) => {
  // Prevent multiple connection attempts
  if (isConnecting || (stompClient && stompClient.connected)) {
    return stompClient;
  }

  // Check if we've exceeded max attempts
  if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    console.error('Maximum WebSocket connection attempts reached');
    return null;
  }

  // Clean up existing connection
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
  }

  isConnecting = true;
  connectionAttempts++;
  
  stompClient = new Client({
    webSocketFactory: () => {
      // Use SockJS for better compatibility
      return new (window as any).SockJS(WS_URL);
    },
    connectHeaders: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    // Disable automatic reconnection to prevent infinite loops
    reconnectDelay: 0,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    debug: (str) => {
      // Only enable debug in development
      if (import.meta.env.DEV) {
        // Reduce debug spam
        if (!str.includes('>>>') && !str.includes('<<<')) {
          console.log('STOMP Debug:', str);
        }
      }
    },
    onConnect: (frame) => {
      isConnecting = false;
      connectionAttempts = 0; // Reset on successful connection
      
      // Subscribe to general session updates
      const subscription1 = stompClient?.subscribe(`/topic/session/${sessionCode}`, (message) => {
        try {
          const data = JSON.parse(message.body);
          
          switch (data.type) {
            case 'SESSION_UPDATE':
              handlers.onSessionUpdate?.(data);
              break;
            case 'PARTICIPANT_UPDATE':
              handlers.onParticipantUpdate?.(data.participants);
              break;
            case 'PHASE_CHANGE':
              handlers.onPhaseChange?.(data);
              break;
            case 'TIMER_START':
              handlers.onTimerStart?.(data);
              break;
            case 'SESSION_ENDED':
              handlers.onSessionEnded?.(data);
              break;
            case 'USER_LEFT':
              handlers.onUserLeft?.(data);
              break;
            case 'ROLE_CHANGE':
              handlers.onRoleChange?.(data);
              break;
            case 'TOPIC_SELECTION_NEEDED':
              handlers.onTopicSelectionNeeded?.(data);
              break;
            default:
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      // Subscribe to session messages
      if (handlers.onMessage) {
        const subscription2 = stompClient?.subscribe(`/topic/session/${sessionCode}/messages`, (message) => {
          try {
            handlers.onMessage?.(JSON.parse(message.body));
          } catch (error) {
            console.error('Error parsing session message:', error);
          }
        });
      }
    },
    onDisconnect: () => {
      console.log('Disconnected from WebSocket');
      isConnecting = false;
    },
    onStompError: (frame) => {
      console.error('WebSocket STOMP error:', frame);
      isConnecting = false;
      // Don't automatically reconnect to prevent infinite loops
    },
    onWebSocketError: (event) => {
      console.error('WebSocket connection error:', event);
      isConnecting = false;
      // Don't automatically reconnect to prevent infinite loops
    },
    onWebSocketClose: (event) => {
      console.log('WebSocket connection closed:', event);
      isConnecting = false;
      // Don't automatically reconnect to prevent infinite loops
    }
  });

  try {
    stompClient.activate();
  } catch (error) {
    console.error('Failed to activate WebSocket client:', error);
    isConnecting = false;
  }
  
  return stompClient;
};

export const disconnectWebSocket = () => {
  if (stompClient) {
    try {
      stompClient.deactivate();
    } catch (error) {
      console.error('Error disconnecting WebSocket:', error);
    }
    stompClient = null;
  }
  isConnecting = false;
  connectionAttempts = 0; // Reset connection attempts on manual disconnect
};

export const sendSessionMessage = (sessionCode: string, content: string, senderName: string) => {
  if (stompClient && stompClient.connected) {
    stompClient.publish({
      destination: '/app/session.message',
      body: JSON.stringify({
        sessionCode,
        content,
        senderName,
      }),
    });
  }
};

// Auth API
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const register = (name: string, email: string, password: string) =>
  api.post('/auth/register', { name, email, password });

// Session API
export const createSession = (sessionData: {
  title: string;
  sessionType?: string;
  readingTime?: number;
  consultationTime?: number;
  timingType?: string;
  selectedTopics?: string[];
}) => api.post('/sessions', sessionData);

export const joinSessionByCode = (sessionCode: string) =>
  api.post('/sessions/join', { code: sessionCode });

export const joinSessionWithRole = (sessionCode: string, role: string) =>
  api.post(`/sessions/${sessionCode}/join-with-role`, { role });

export const configureSession = (sessionCode: string, config: any) =>
  api.post(`/sessions/${sessionCode}/configure`, config);

export const startSession = (sessionCode: string) =>
  api.post(`/sessions/${sessionCode}/start`);

export const getSessionByCode = (sessionCode: string) =>
  api.get(`/sessions/${sessionCode}`);

export const skipPhase = (sessionCode: string) =>
  api.post(`/sessions/${sessionCode}/skip-phase`);

export const completeSession = async (sessionCode: string) => {
  const response = await fetch(`${API_URL}/sessions/${sessionCode}/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to complete session');
  }

  return response.json();
};

export const leaveSession = (sessionCode: string) =>
  api.post(`/sessions/${sessionCode}/leave`);

export const getActiveSessions = () =>
  api.get('/sessions/active');

export const getUserSessions = () =>
  api.get('/sessions/user');

export const getUserActiveSessions = () =>
  api.get('/sessions/user/active');

// Cases API
export const getAllCases = () =>
  api.get('/cases');

export const getCaseById = (id: number) =>
  api.get(`/cases/${id}`);

export const getCasesByCategory = (categoryId: number) =>
  api.get(`/cases/by-category/${categoryId}`);

export const getCasesByTopics = (topics: string[]) =>
  api.get(`/cases/by-topics?topics=${topics.join(',')}`);

export const getRandomCase = (topics?: string[]) =>
  api.get(`/cases/random${topics ? `?topics=${topics.join(',')}` : ''}`);

export const requestNewCase = (sessionCode: string) =>
  api.post(`/sessions/${sessionCode}/new-case`);

export const selectNewTopic = (sessionCode: string, topic: string) =>
  api.post(`/sessions/${sessionCode}/select-new-topic`, { topic });

export const endSession = (sessionCode: string) =>
  api.post(`/sessions/${sessionCode}/end`);

export const getCategories = () =>
  api.get('/categories');

// Feedback API
export const submitFeedback = async (sessionCode: string, feedbackData: {
  comment: string;
  criteriaScores: Array<{
    criterionId: string;
    criterionName: string;
    score: number | null;
    subScores: Array<{
      subCriterionId: string;
      subCriterionName: string;
      score: number | null;
    }>;
  }>;
}) => {
  try {
    const payload = {
      sessionCode,
      ...feedbackData
    };
    
    const response = await api.post('/feedback/submit', payload);
    return response;
  } catch (error: any) {
    console.error('❌ Detailed feedback submission error:');
    console.error('   message:', error.message);
    console.error('   status:', error.response?.status);
    console.error('   statusText:', error.response?.statusText);
    console.error('   response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('   request config:', {
      url: error.config?.url,
      method: error.config?.method,
      data: error.config?.data
    });
    throw error;
  }
};

// Recall API methods
export const getAllRecallCases = () =>
  api.get('/cases/recall');

export const getAllRecallDates = () =>
  api.get('/cases/recall/dates');

export const getRecallCasesByDate = (date: string) =>
  api.get(`/cases/recall/by-date?date=${date}`);

export const getRecallCasesByDateRange = (startDate: string, endDate: string) =>
  api.get(`/cases/recall/by-date-range?startDate=${startDate}&endDate=${endDate}`);

export const getRandomRecallCase = (date: string) =>
  api.get(`/cases/recall/random?date=${date}`);

export const getRandomRecallCaseFromRange = (startDate: string, endDate: string, excludeCaseIds?: number[]) => {
  const params = new URLSearchParams({
    startDate,
    endDate,
  });
  
  if (excludeCaseIds && excludeCaseIds.length > 0) {
    excludeCaseIds.forEach(id => params.append('excludeCaseIds', id.toString()));
  }
  
  return api.get(`/cases/recall/random-from-range?${params.toString()}`);
};

export const getReceivedFeedback = () =>
  api.get('/feedback/received');

export const getSessionFeedback = (sessionCode: string) =>
  api.get(`/feedback/session/${sessionCode}`);

// Session observer feedback status check
export const getObserverFeedbackStatus = (sessionCode: string) =>
  api.get(`/sessions/${sessionCode}/observer-feedback-status`);

// Export api as named export to fix import errors
export { api };

export default api; 