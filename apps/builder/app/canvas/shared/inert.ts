let resetTimeoutHandle: number | undefined = undefined;

const resetAutoDisposeInert = () => {
  if (resetTimeoutHandle === undefined) {
    return;
  }
  document.body.removeAttribute("inert");
  clearTimeout(resetTimeoutHandle);
  resetTimeoutHandle = undefined;
};

let lastPointerEventTime = Date.now();
// 1000 ms is a reasonable time for the preview to reset.
// Anyway should never happen after user has finished preview changes (can happen during preview changes)
const AUTO_DISPOSE_INERT_TIMEOUT = 1000;

// A brief delay to ensure mutation observers within the focus scope are activated by the preview changes.
const DISPOSE_INERT_TIMEOUT = 300;

const PREVENT_INERT_TIMEOUT = 100;

const setAutoDisposeInert = (timeout: number) => {
  // Some events in the builder can occur after clicking on the canvas (e.g., blur on an input field).
  // In such cases, we should prevent 'inert' from being set and allow the selection to complete.
  if (Date.now() - lastPointerEventTime < PREVENT_INERT_TIMEOUT) {
    return;
  }

  document.body.setAttribute("inert", "true");

  // To prevent a completely non-interactive canvas due to edge cases,
  // make sure to clean up preview changes if preview styles fail to reset correctly.
  clearTimeout(resetTimeoutHandle);

  resetTimeoutHandle = window.setTimeout(resetAutoDisposeInert, timeout);
};

/**
 * Controls (e.g., radix focus scope) may inadvertently shift focus from inputs.
 * Example: When the user modifies styles or content in the settings panel, the use of a mutation observer with Radix causes the focus to shift to the Radix dialog.
 * Currently, there's no way to block focus shifts inside iframes (see https:*github.com/w3c/webappsec-permissions-policy/issues/273 for future updates).
 * Workaround: use the `inert` attribute on iframe body to prevent focus changes.
 */
export const setInert = () => setAutoDisposeInert(AUTO_DISPOSE_INERT_TIMEOUT);
export const resetInert = () => setAutoDisposeInert(DISPOSE_INERT_TIMEOUT);

// window.self !== window.top means we are on canvas
if (typeof window !== "undefined" && window.self !== window.top) {
  window.addEventListener("pointerdown", () => {
    lastPointerEventTime = Date.now();
  });
}
