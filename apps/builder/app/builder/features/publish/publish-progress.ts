import { useCallback, useEffect, useState } from "react";

const COUNTDOWN_DURATION = 60_000;

export const usePublishProgress = () => {
  const [startedAt, setStartedAt] = useState<number>();
  const [showCountdown, setShowCountdown] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (isPublishing === false || showCountdown === false) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isPublishing, showCountdown]);

  const countdown =
    isPublishing && showCountdown && startedAt !== undefined
      ? Math.max(0, Math.ceil((COUNTDOWN_DURATION - (now - startedAt)) / 1000))
      : undefined;

  const dismissCountdown = useCallback(() => setShowCountdown(false), []);

  const start = (publish: () => Promise<void>) => {
    const startedAt = Date.now();
    setStartedAt(startedAt);
    setNow(startedAt);
    setShowCountdown(true);
    setIsPublishing(true);
    void publish()
      .catch((error) => {
        console.error(error);
      })
      .finally(() => setIsPublishing(false));
  };

  return {
    isPublishing,
    countdown,
    start,
    dismissCountdown,
  };
};
