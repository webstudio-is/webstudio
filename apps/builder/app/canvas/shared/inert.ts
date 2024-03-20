let resetTimeoutHandle: number | undefined = undefined;

const resetAutoDisposeInert = () => {
  document.body.removeAttribute("inert");
  clearTimeout(resetTimeoutHandle);
  resetTimeoutHandle = undefined;
};

// 1000 ms is a reasonable time for the preview to reset.
// Anyway should never happen after user has finished preview changes (can happen during preview changes)
const AUTO_DISPOSE_INERT_TIMEOUT = 1000;

// A brief delay to ensure mutation observers within the focus scope are activated by the preview changes.
const DISPOSE_INERT_TIMEOUT = 300;

const setAutoDisposeInert = (timeout: number) => {
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
