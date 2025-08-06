import axios from 'axios'
import { supabase } from '../lib/supabase'
import { store } from '../store'

// Environment-based API URLs
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

// Create a new axios instance for Supabase-authenticated requests
const supabaseApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add Supabase token
supabaseApi.interceptors.request.use(
  async (config) => {
    try {
      // Get the current session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting Supabase session:', error)
        return config
      }

      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`
      }
      
      return config
    } catch (error) {
      console.error('Error setting authorization header:', error)
      return config
    }
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
supabaseApi.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token might be expired, try to refresh
      try {
        const { data: { session }, error: refreshError } = await supabase.auth.getSession()
        
        if (refreshError || !session) {
          // Sign out if refresh fails
          await supabase.auth.signOut()
          window.location.href = '/login'
          return Promise.reject(error)
        }
      } catch (refreshError) {
        console.error('Error refreshing session:', refreshError)
        await supabase.auth.signOut()
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

// User sync API methods
export const syncSupabaseUser = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('No valid Supabase session')
    }

    const response = await supabaseApi.post('/auth/sync-supabase-user')
    return response.data
  } catch (error: any) {
    console.error('Error syncing Supabase user:', error)
    throw error
  }
}

export const getUserProfile = async () => {
  try {
    const response = await supabaseApi.get('/auth/user-profile')
    return response.data
  } catch (error: any) {
    console.error('Error getting user profile:', error)
    throw error
  }
}

// Session API with Supabase authentication
export const createSession = (sessionData: {
  title: string
  sessionType?: string
  readingTime?: number
  consultationTime?: number
  timingType?: string
  selectedTopics?: string[]
}) => supabaseApi.post('/sessions', sessionData)

export const joinSessionByCode = (sessionCode: string) =>
  supabaseApi.post('/sessions/join', { code: sessionCode })

export const joinSessionWithRole = (sessionCode: string, role: string) =>
  supabaseApi.post(`/sessions/${sessionCode}/join-with-role`, { role })

export const configureSession = (sessionCode: string, config: any) =>
  supabaseApi.post(`/sessions/${sessionCode}/configure`, config)

export const startSession = (sessionCode: string) =>
  supabaseApi.post(`/sessions/${sessionCode}/start`)

export const getSessionByCode = (sessionCode: string) =>
  supabaseApi.get(`/sessions/${sessionCode}`)

export const skipPhase = (sessionCode: string) =>
  supabaseApi.post(`/sessions/${sessionCode}/skip-phase`)

export const completeSession = async (sessionCode: string) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  const response = await fetch(`${API_URL}/sessions/${sessionCode}/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to complete session')
  }

  return response.json()
}

export const leaveSession = (sessionCode: string) =>
  supabaseApi.post(`/sessions/${sessionCode}/leave`)

export const getActiveSessions = () =>
  supabaseApi.get('/sessions/active')

export const getUserSessions = () =>
  supabaseApi.get('/sessions/user')

export const getUserActiveSessions = () =>
  supabaseApi.get('/sessions/user/active')

// Cases API
export const getAllCases = () =>
  supabaseApi.get('/cases')

export const getCaseById = (id: number) =>
  supabaseApi.get(`/cases/${id}`)

export const getCasesByCategory = (categoryId: number) =>
  supabaseApi.get(`/cases/by-category/${categoryId}`)

export const getCasesByTopics = (topics: string[]) =>
  supabaseApi.get(`/cases/by-topics?topics=${topics.join(',')}`)

export const getRandomCase = (topics?: string[]) =>
  supabaseApi.get(`/cases/random${topics ? `?topics=${topics.join(',')}` : ''}`)

export const requestNewCase = (sessionCode: string) =>
  supabaseApi.post(`/sessions/${sessionCode}/new-case`)

export const selectNewTopic = (sessionCode: string, topic: string) =>
  supabaseApi.post(`/sessions/${sessionCode}/select-new-topic`, { topic })

export const endSession = (sessionCode: string) =>
  supabaseApi.post(`/sessions/${sessionCode}/end`)

export const getCategories = () =>
  supabaseApi.get('/categories')

// Feedback API
export const submitFeedback = async (sessionCode: string, feedbackData: {
  comment: string
  criteriaScores: Array<{
    criterionId: string
    criterionName: string
    score: number | null
    subScores: Array<{
      subCriterionId: string
      subCriterionName: string
      score: number | null
    }>
  }>
}) => {
  try {
    const payload = {
      sessionCode,
      ...feedbackData
    }
    
    const response = await supabaseApi.post('/feedback/submit', payload)
    return response
  } catch (error: any) {
    console.error('❌ Detailed feedback submission error:')
    console.error('   message:', error.message)
    console.error('   status:', error.response?.status)
    console.error('   statusText:', error.response?.statusText)
    console.error('   response data:', JSON.stringify(error.response?.data, null, 2))
    throw error
  }
}

// Recall API methods
export const getAllRecallCases = () =>
  supabaseApi.get('/cases/recall')

export const getAllRecallDates = () =>
  supabaseApi.get('/cases/recall/dates')

export const getRecallCasesByDate = (date: string) =>
  supabaseApi.get(`/cases/recall/by-date?date=${date}`)

export const getRecallCasesByDateRange = (startDate: string, endDate: string) =>
  supabaseApi.get(`/cases/recall/by-date-range?startDate=${startDate}&endDate=${endDate}`)

export const getRandomRecallCase = (date: string) =>
  supabaseApi.get(`/cases/recall/random?date=${date}`)

export const getRandomRecallCaseFromRange = (startDate: string, endDate: string, excludeCaseIds?: number[]) => {
  const params = new URLSearchParams({
    startDate,
    endDate,
  })
  
  if (excludeCaseIds && excludeCaseIds.length > 0) {
    excludeCaseIds.forEach(id => params.append('excludeCaseIds', id.toString()))
  }
  
  return supabaseApi.get(`/cases/recall/random-from-range?${params.toString()}`)
}

export const getReceivedFeedback = () =>
  supabaseApi.get('/feedback/received')

export const getSessionFeedback = (sessionCode: string) =>
  supabaseApi.get(`/feedback/session/${sessionCode}`)

// Session observer feedback status check
export const getObserverFeedbackStatus = (sessionCode: string) =>
  supabaseApi.get(`/sessions/${sessionCode}/observer-feedback-status`)

// WebSocket helper to get current token
export const getSupabaseToken = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch (error) {
    console.error('Error getting Supabase token:', error)
    return null
  }
}

export { supabaseApi }
export default supabaseApi