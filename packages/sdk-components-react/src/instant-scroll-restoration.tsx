import type { ReactNode } from "react";

// The router's inline restore runs before React hydration, so the hook alone
// cannot stop a full reload from animating to the saved position.
const beforeRestore = `window.__webstudioScrollBehavior = [document.documentElement.hasAttribute("style"), document.documentElement.style.getPropertyValue("scroll-behavior"), document.documentElement.style.getPropertyPriority("scroll-behavior")]; document.documentElement.style.setProperty("scroll-behavior", "auto", "important");`;
const afterRestore = `if (window.__webstudioScrollBehavior) { const [hadStyle, value, priority] = window.__webstudioScrollBehavior; const html = document.documentElement; html.style.setProperty("scroll-behavior", value, priority); if (!hadStyle && html.style.length === 0 && html.hasAttribute("style")) html.removeAttribute("style"); delete window.__webstudioScrollBehavior; }`;

export const InstantScrollRestoration = ({
  children,
  nonce,
}: {
  children: ReactNode;
  nonce?: string;
}) => (
  <>
    <script
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: beforeRestore }}
    />
    {children}
    <script
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: afterRestore }}
    />
  </>
);
