# PLAB 2 Practice Platform: Feature Extension Specification

## Purpose

This document outlines the specific feature requirements and logical constraints related to implementing **New Case** and **Change Role** functionalities in an already working PLAB 2 Practice platform. You should focus only on these additions, without altering the existing core flow or introducing unnecessary complexity.

---

## Existing System (Summary)

- The application already supports:
  - Role selection (Doctor, Patient, Observer)
  - Session creation and joining
  - Timed phase transitions (Reading → Consultation → Feedback)
  - Role-specific visibility and case content
  - Feedback submission during the Feedback Phase

These parts of the application **do not need to be touched**.

---

## New Features To Implement

### 1. **New Case Button**

**Purpose**: Allow users to reset the session with a new case from the same category **without changing roles**.

**Visibility**:

- Available in two locations:
  - **During the Reading Phase** (in case the Doctor decides the current case is already known or unsuitable).
  - **After the Feedback Phase**.

**Behavior**:

- Fetch a new case from the **same category**.
- Reset the session to the **Reading Phase**.
- Retain the same roles and participants.
- Timer resets based on original phase durations.

**Validation Rules**:

- During **Feedback Phase**, New Case must be **disabled** unless **both Patient and Observer have submitted feedback**.
- If the button is clicked prematurely, show a **warning message**: “Please submit all feedback before starting a new case.”
- In **Reading Phase**, no feedback requirement check is necessary.

### 2. **Change Role Button**

**Purpose**: Let all users switch roles without leaving or recreating the session.

**Visibility**:

- Only appears after the **Feedback Phase**.

**Behavior**:

- All participants are redirected to the **Role Selection** screen.
- Session ID remains the same.
- A new case is fetched automatically.
- Reading Phase begins with the new roles.
- No need to configure session again. Just role changes and new case with new roles

**Validation Rules**:

- Button must remain **disabled** until **both Patient and Observer have submitted feedback**.
- If clicked early, show warning: “Please wait for all participants to submit feedback before changing roles.”
- Make sure dashboard feedback section can show which role gave the feedback if the feedback received from both roles (Patient and Observer)

### 3. **Remove diffuclty level of cases**

**Purpose**: Remove case difficulty from everywhere in the application it is unneccesary

---

## Developer Notes for Cursor

- Do **not** modify any existing functionality.
- Keep the new implementation **clean, modular, and minimal**.
- Avoid repetition: reuse existing case-fetching and phase-transition logic.
- Ensure socket or session-based sync between participants when triggering New Case or Change Role.
- Ensure that unauthorized role or phase access is blocked by guards.
- Avoid adding configuration state that already exists elsewhere.
- Respect existing UI structure and role visibility logic.
- Properly test 3-user sessions (Doctor + Patient + Observer) to confirm multi-feedback synchronization works correctly.

---

## Summary

Two enhancements are required: `New Case` and `Change Role`, both added cleanly to the existing structure. New Case must also be available during Reading Phase for convenience. Feedback submission by both Patient and Observer must be enforced before any transition occurs from Feedback Phase. All changes must maintain current system integrity without adding unnecessary complexity.
