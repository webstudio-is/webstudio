import { useEffect } from "react";

/**
 * Disables the default browser context menu throughout the application,
 * except for interactive elements like links, inputs, textareas, etc.
 *
 * Users expect to see Webstudio's custom context menu when right-clicking,
 * not the browser's default menu. This hook prevents confusion by ensuring
 * only the application's context menu appears, while still allowing the
 * browser menu for interactive elements where it's useful (e.g., copy/paste
 * in inputs, open link in new tab).
 */
export const useDisableContextMenu = () => {
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Allow context menu for interactive elements
      const interactiveSelectors = [
        "input",
        "textarea",
        "select",
        "a[href]",
        '[contenteditable="true"]',
        "pre",
      ];

      const isInteractive = interactiveSelectors.some((selector) =>
        target.closest(selector)
      );

      if (!isInteractive) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);
};
