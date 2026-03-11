import { useState, useCallback, useRef, useEffect } from "react";

interface RateLimiterOptions {
  /** Minimum time between actions in milliseconds */
  cooldownMs: number;
  /** Maximum number of actions allowed within the window */
  maxActions?: number;
  /** Time window for maxActions in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number;
}

interface RateLimiterResult {
  /** Whether the action can be performed */
  canPerform: boolean;
  /** Seconds remaining until next allowed action */
  cooldownRemaining: number;
  /** Wrapper function that respects rate limits */
  performAction: <T>(action: () => Promise<T> | T) => Promise<T | undefined>;
  /** Number of actions remaining in the current window */
  actionsRemaining: number;
  /** Reset the rate limiter */
  reset: () => void;
}

/**
 * Hook for rate limiting user actions
 * Useful for preventing spam on expensive operations like API calls
 */
export function useRateLimiter({
  cooldownMs,
  maxActions = Infinity,
  windowMs = 60000,
}: RateLimiterOptions): RateLimiterResult {
  const [lastActionTime, setLastActionTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const actionTimestamps = useRef<number[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up old timestamps outside the window
  const cleanupOldTimestamps = useCallback(() => {
    const now = Date.now();
    actionTimestamps.current = actionTimestamps.current.filter(
      (ts) => now - ts < windowMs
    );
  }, [windowMs]);

  // Calculate actions remaining in window
  const getActionsRemaining = useCallback(() => {
    cleanupOldTimestamps();
    return Math.max(0, maxActions - actionTimestamps.current.length);
  }, [cleanupOldTimestamps, maxActions]);

  // Check if action can be performed
  const canPerform = useCallback(() => {
    const now = Date.now();
    const timeSinceLastAction = now - lastActionTime;
    const cooldownPassed = timeSinceLastAction >= cooldownMs;
    const hasActionsRemaining = getActionsRemaining() > 0;
    return cooldownPassed && hasActionsRemaining;
  }, [lastActionTime, cooldownMs, getActionsRemaining]);

  // Update cooldown timer
  useEffect(() => {
    if (lastActionTime > 0) {
      const updateCooldown = () => {
        const remaining = Math.max(0, cooldownMs - (Date.now() - lastActionTime));
        setCooldownRemaining(Math.ceil(remaining / 1000));
        
        if (remaining <= 0 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };

      updateCooldown();
      intervalRef.current = setInterval(updateCooldown, 100);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [lastActionTime, cooldownMs]);

  // Perform action with rate limiting
  const performAction = useCallback(
    async <T>(action: () => Promise<T> | T): Promise<T | undefined> => {
      if (!canPerform()) {
        return undefined;
      }

      const now = Date.now();
      setLastActionTime(now);
      actionTimestamps.current.push(now);

      return await action();
    },
    [canPerform]
  );

  // Reset rate limiter
  const reset = useCallback(() => {
    setLastActionTime(0);
    setCooldownRemaining(0);
    actionTimestamps.current = [];
  }, []);

  return {
    canPerform: canPerform(),
    cooldownRemaining,
    performAction,
    actionsRemaining: getActionsRemaining(),
    reset,
  };
}

/**
 * Simple debounce hook for button clicks
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref on change
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timeoutRef.current = null;
      }, delayMs);
    },
    [delayMs]
  );
}
