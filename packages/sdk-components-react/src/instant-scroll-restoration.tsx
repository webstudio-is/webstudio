import { useLayoutEffect, useRef, type ReactNode } from "react";

// The router's inline restore runs before React hydration, so client effects
// alone cannot stop a full reload from animating to the saved position.
const beforeRestore = `window.__webstudioScrollBehavior = [document.documentElement.hasAttribute("style"), document.documentElement.style.getPropertyValue("scroll-behavior"), document.documentElement.style.getPropertyPriority("scroll-behavior")]; document.documentElement.style.setProperty("scroll-behavior", "auto", "important");`;
const afterRestore = `if (window.__webstudioScrollBehavior) { const [hadStyle, value, priority] = window.__webstudioScrollBehavior; const html = document.documentElement; html.style.setProperty("scroll-behavior", value, priority); if (!hadStyle && html.style.length === 0 && html.hasAttribute("style")) html.removeAttribute("style"); delete window.__webstudioScrollBehavior; }`;

type Navigation = {
  locationKey: string;
  hash: string;
  navigationType: string;
};

const PrepareScrollRestoration = ({
  locationKey,
  hash,
  navigationType,
  restoreRef,
}: Navigation & { restoreRef: { current: (() => void) | undefined } }) => {
  useLayoutEffect(() => {
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
  }, [locationKey, hash, navigationType, restoreRef]);
  return null;
};

export const InstantScrollRestoration = ({
  children,
  nonce,
  locationKey,
  hash,
  navigationType,
}: {
  children: ReactNode;
  nonce?: string;
} & Navigation) => {
  const restoreRef = useRef<(() => void) | undefined>();
  // Child layout effects run first: prepare, router restoration, then cleanup.
  useLayoutEffect(
    () => restoreRef.current?.(),
    [locationKey, hash, navigationType]
  );
  return (
    <>
      <script
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: beforeRestore }}
      />
      <PrepareScrollRestoration
        locationKey={locationKey}
        hash={hash}
        navigationType={navigationType}
        restoreRef={restoreRef}
      />
      {children}
      <script
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: afterRestore }}
      />
    </>
  );
};
