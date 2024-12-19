import { useCallback } from "react";
import { canvasApi } from "~/shared/canvas-api";
import { $textEditingInstanceSelector } from "~/shared/nano-states";

export const skipInertHandlersAttribute = "data-ws-skip-inert-handlers";

export const useInertHandlers = () => {
  /**
   * Prevents Lexical text editor from stealing focus during rendering.
   * Sets the inert attribute on the canvas body element and disables the text editor.
   *
   * This must be done synchronously to avoid the following issue:
   *
   * 1. Text editor is in edit state.
   * 2. User focuses on the builder (e.g., clicks any input).
   * 3. The text editor blur event triggers, causing a rerender on data change (data saved in onBlur).
   * 4. Text editor rerenders, stealing focus from the builder.
   * 5. Inert attribute is set asynchronously, but focus is already lost.
   *
   * Synchronous focusing and setInert prevent the text editor from focusing on render.
   * This cannot be handled inside the canvas because the text editor toolbar is in the builder and focus events in the canvas should be ignored.
   *
   * Use onPointerDown instead of onFocus because Radix focus lock triggers on text edit blur
   * before the focusin event when editing text inside a Radix dialog.
   */
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (
      event.target instanceof Element &&
      event.target.closest(`[${skipInertHandlersAttribute}]`)
    ) {
      return;
    }

    // Ignore toolbar focus events. See the onFocus handler in text-toolbar.tsx
    if (false === event.defaultPrevented) {
      canvasApi.setInert();
      $textEditingInstanceSelector.set(undefined);
    }
  }, []);

  /**
   * Prevent Radix from stealing focus during editing in the style sources
   * For example, when the user select or create new style source item inside a dialog.
   */
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (
      event.target instanceof Element &&
      event.target.closest(`[${skipInertHandlersAttribute}]`)
    ) {
      return;
    }

    if (event.target instanceof HTMLInputElement) {
      canvasApi.setInert();
    }
  }, []);

  /**
   * Prevent Radix from stealing focus during editing in the settings panel.
   * For example, when the user modifies the text content of an H1 element inside a dialog.
   */
  const onInput = useCallback((event: React.FormEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest(`[${skipInertHandlersAttribute}]`)
    ) {
      return;
    }

    canvasApi.setInert();
  }, []);

  return {
    onInput,
    onKeyDown,
    onPointerDown,
  };
};
