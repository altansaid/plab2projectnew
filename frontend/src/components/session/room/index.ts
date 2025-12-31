/**
 * Session Room Components
 * 
 * This module exports the refactored components from SessionRoom.tsx
 * Each component is responsible for a specific part of the session room UI:
 * 
 * - SessionTimer: Timer display with countdown and progress bar
 * - ParticipantsList: List of session participants with roles
 * - CaseDisplay: Medical case information display based on user role
 * - FeedbackPanel: Feedback form with rating buttons and submission
 */

export { default as SessionTimer, useClientTimer } from "./SessionTimer";
export type { ClientTimer } from "./SessionTimer";

export { default as ParticipantsList } from "./ParticipantsList";
export type { Participant } from "./ParticipantsList";

export { default as CaseDisplay } from "./CaseDisplay";
export type { CaseData } from "./CaseDisplay";

export { default as FeedbackPanel } from "./FeedbackPanel";
export type { 
  FeedbackCriterion, 
  FeedbackCriteriaScore, 
  FeedbackState 
} from "./FeedbackPanel";

