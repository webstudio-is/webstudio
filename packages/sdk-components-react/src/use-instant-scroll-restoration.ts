import { useInsertionEffect, useLayoutEffect, useRef } from "react";

export const useInstantScrollRestoration = ({
  key,
  hash,
  navigationType,
}: {
  key: string;
  hash: string;
  navigationType: string;
}) => {
  const restoreRef = useRef<(() => void) | undefined>(undefined);
  useInsertionEffect(() => {
    if (
      navigationType !== "POP" &&
      hash !== "" &&
      document.getElementById(decodeURIComponent(hash.slice(1))) !== null
    ) {
      return;
    }
    const style = document.documentElement.style;
    const value = style.getPropertyValue("scroll-behavior");
    const priority = style.getPropertyPriority("scroll-behavior");
    // Router restoration runs in a child layout effect. Keep its scroll instant
    // without changing authored anchor scrolling after this commit.
    style.setProperty("scroll-behavior", "auto", "important");
    const restore = () => {
      if (restoreRef.current !== restore) {
        return;
      }
      style.setProperty("scroll-behavior", value, priority);
      restoreRef.current = undefined;
    };
    restoreRef.current = restore;
    return restore;
  }, [key, hash, navigationType]);
  useLayoutEffect(() => {
    restoreRef.current?.();
  }, [key, hash, navigationType]);
};
