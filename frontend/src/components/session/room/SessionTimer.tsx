import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { Box, Typography, LinearProgress } from "@mui/material";

/**
 * Timer state interface
 */
interface TimerState {
  isActive: boolean;
  startTimestamp: number;
  durationSeconds: number;
  phase: string;
}

/**
 * Custom hook for client-side timer management
 * Handles countdown calculations locally to reduce server load
 */
export const useClientTimer = () => {
  const [timerState, setTimerState] = useState<TimerState>({
    isActive: false,
    startTimestamp: 0,
    durationSeconds: 0,
    phase: "waiting",
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start client-side timer with given parameters
  const startClientTimer = useCallback(
    (durationSeconds: number, startTimestamp: number, phase: string) => {
      setTimerState({
        isActive: true,
        startTimestamp,
        durationSeconds,
        phase,
      });

      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Start local countdown - updates every second for smooth display
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimestamp) / 1000);
        const remaining = Math.max(0, durationSeconds - elapsed);

        if (remaining <= 0) {
          setTimerState((prev) => ({ ...prev, isActive: false }));
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, 1000);
    },
    []
  );

  // Stop client-side timer
  const stopClientTimer = useCallback(() => {
    setTimerState((prev) => ({
      ...prev,
      isActive: false,
    }));

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Get current remaining time (calculated locally)
  const getRemainingTime = useCallback(() => {
    if (!timerState.isActive || timerState.startTimestamp === 0) {
      return timerState.durationSeconds;
    }

    const now = Date.now();
    const elapsed = Math.floor((now - timerState.startTimestamp) / 1000);
    const remaining = Math.max(0, timerState.durationSeconds - elapsed);

    return remaining;
  }, [timerState.isActive, timerState.startTimestamp, timerState.durationSeconds]);

  // Get total duration
  const getTotalTime = useCallback(() => {
    return timerState.durationSeconds;
  }, [timerState.durationSeconds]);

  // Get current phase
  const getPhase = useCallback(() => {
    return timerState.phase;
  }, [timerState.phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Return stable object to prevent infinite re-renders
  return useMemo(
    () => ({
      startClientTimer,
      stopClientTimer,
      getRemainingTime,
      getTotalTime,
      getPhase,
      isActive: timerState.isActive,
      formatTime: (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
      },
    }),
    [startClientTimer, stopClientTimer, getRemainingTime, getTotalTime, getPhase, timerState.isActive]
  );
};

/**
 * Client timer return type
 */
export interface ClientTimer {
  startClientTimer: (durationSeconds: number, startTimestamp: number, phase: string) => void;
  stopClientTimer: () => void;
  getRemainingTime: () => number;
  getTotalTime: () => number;
  getPhase: () => string;
  isActive: boolean;
  formatTime: (seconds: number) => string;
}

/**
 * SessionTimer component props
 */
interface SessionTimerProps {
  clientTimer: ClientTimer;
}

/**
 * SessionTimer component - displays the current timer status with a progress bar
 * Memoized to prevent unnecessary re-renders
 */
const SessionTimer = memo(({ clientTimer }: SessionTimerProps) => {
  const [displayTime, setDisplayTime] = useState(0);
  const [displayTotal, setDisplayTotal] = useState(0);

  useEffect(() => {
    const updateDisplay = () => {
      setDisplayTime(clientTimer.getRemainingTime());
      setDisplayTotal(clientTimer.getTotalTime());
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);

    return () => clearInterval(interval);
  }, [clientTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = displayTotal > 0 ? ((displayTotal - displayTime) / displayTotal) * 100 : 0;

  // Determine color based on remaining time
  const getTimerColor = () => {
    if (displayTime <= 30) return "error.main";
    if (displayTime <= 60) return "warning.main";
    return "primary.main";
  };

  return (
    <Box sx={{ textAlign: "center", mb: 2 }}>
      <Typography
        variant="h4"
        component="div"
        sx={{
          mb: 1,
          fontWeight: 600,
          color: getTimerColor(),
          fontFamily: "monospace",
        }}
      >
        {formatTime(displayTime)}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: "rgba(0,0,0,0.1)",
          "& .MuiLinearProgress-bar": {
            borderRadius: 4,
            transition: "transform 1s linear",
          },
        }}
      />
    </Box>
  );
});

SessionTimer.displayName = "SessionTimer";

export default SessionTimer;

