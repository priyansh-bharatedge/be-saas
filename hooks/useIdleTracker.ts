"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface UseIdleTrackerOptions {
  /**
   * Current tracker status: "ACTIVE" | "IDLE" | "CLOCKED_OUT"
   */
  status: "ACTIVE" | "IDLE" | "CLOCKED_OUT";
  /**
   * Inactivity threshold in milliseconds (default: 5 minutes = 300,000ms)
   */
  idleTimeoutMs?: number;
  /**
   * Callback fired when exactly 5 minutes of inactivity elapse while ACTIVE
   */
  onIdle: () => void | Promise<void>;
  /**
   * Callback fired when user activity resumes while in IDLE state (Auto-Resume)
   */
  onAutoResume: () => void | Promise<void>;
}

export function useIdleTracker({
  status,
  idleTimeoutMs = 5 * 60 * 1000, // 5 minutes
  onIdle,
  onAutoResume,
}: UseIdleTrackerOptions) {
  const lastActivityRef = useRef<number>(Date.now());
  const [secondsUntilIdle, setSecondsUntilIdle] = useState<number>(
    Math.round(idleTimeoutMs / 1000)
  );
  const [isIdleState, setIsIdleState] = useState<boolean>(status === "IDLE");

  // Keep callback refs stable to avoid resetting intervals
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const onAutoResumeRef = useRef(onAutoResume);
  onAutoResumeRef.current = onAutoResume;

  const statusRef = useRef(status);
  statusRef.current = status;

  // Throttled activity handler
  const handleActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // If currently IDLE, user activity immediately triggers Auto-Resume!
    if (statusRef.current === "IDLE") {
      setIsIdleState(false);
      onAutoResumeRef.current();
    }
  }, []);

  // Set up event listeners for mousemove, keydown, scroll, and click
  useEffect(() => {
    // Only listen if user is clocked in (ACTIVE or IDLE)
    if (status === "CLOCKED_OUT") {
      setSecondsUntilIdle(Math.round(idleTimeoutMs / 1000));
      return;
    }

    // Reset last activity to current time on status change
    lastActivityRef.current = Date.now();
    setIsIdleState(status === "IDLE");

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "scroll",
      "click",
      "touchstart",
    ];

    // Throttled event listener (runs at most once every 300ms for performance)
    let lastHandled = 0;
    const throttledListener = () => {
      const now = Date.now();
      if (now - lastHandled > 300) {
        lastHandled = now;
        handleActivity();
      }
    };

    events.forEach((evt) => {
      window.addEventListener(evt, throttledListener, { passive: true });
    });

    // Inactivity evaluation ticker (runs every 1 second)
    const interval = setInterval(() => {
      if (statusRef.current !== "ACTIVE") {
        return;
      }

      const elapsedMs = Date.now() - lastActivityRef.current;
      const remainingSec = Math.max(0, Math.ceil((idleTimeoutMs - elapsedMs) / 1000));
      setSecondsUntilIdle(remainingSec);

      // Check if 5 minutes elapsed
      if (elapsedMs >= idleTimeoutMs) {
        setIsIdleState(true);
        onIdleRef.current();
      }
    }, 1000);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, throttledListener);
      });
      clearInterval(interval);
    };
  }, [status, idleTimeoutMs, handleActivity]);

  // Helper method to manually trigger idle simulation for testing/demo
  const simulateIdle = useCallback(() => {
    if (statusRef.current === "ACTIVE") {
      setIsIdleState(true);
      onIdleRef.current();
    }
  }, []);

  return {
    isIdle: isIdleState || status === "IDLE",
    secondsUntilIdle,
    simulateIdle,
  };
}
