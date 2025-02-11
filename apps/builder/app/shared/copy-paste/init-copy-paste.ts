import { toastError } from "../error/toast-error";
import {
  $authTokenPermissions,
  $textEditingInstanceSelector,
} from "../nano-states";
import * as instance from "./plugin-instance";
import * as embedTemplate from "./plugin-embed-template";
import * as markdown from "./plugin-markdown";
import * as webflow from "./plugin-webflow/plugin-webflow";
import { builderApi } from "../builder-api";

const isTextEditing = (event: ClipboardEvent) => {
  // Text is edited on the Canvas using the default Canvas text editor settings.
  if ($textEditingInstanceSelector.get() != null) {
    return true;
  }

  // Text is edited inside an input, textarea, or contenteditable (i.e. codemirror editor) field.
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    (event.target instanceof HTMLElement &&
      event.target.closest("[contenteditable]"))
  ) {
    return true;
  }

  return false;
};

/**
 *
 * # Note:
 * validateClipboardEvent determines when to use default copy/paste behavior or if a WebStudio instance will be copied, pasted, or cut.
 * # How to test:
 * 1. Focus on an input in the style panel (width, style source) or name input in settings. Select the text, then copy and paste any instance in the Navigator tree or on the Canvas.
 * 2. Edit text in a paragraph on the Canvas. Select text (single or multiple lines), then press Cmd+X. The paragraph should not be deleted.
 * 3. Select CSS preview text, then select an instance in the Navigator. Press Cmd+C, then Cmd+V.
 **/
const validateClipboardEvent = (event: ClipboardEvent) => {
  if (event.clipboardData === null) {
    return false;
  }

  if (isTextEditing(event)) {
    return false;
  }

  // Allows native selection of text in the Builder panels, such as CSS Preview.
  if (event.type === "copy") {
    const isInBuilderContext = window.self === window.top;
    const selection = window.getSelection();

    if (isInBuilderContext && selection && selection.isCollapsed === false) {
      return false;
    }
  }

  if ($authTokenPermissions.get().canCopy === false) {
    toastError("Copying has been disabled by the project owner");
    return false;
  }
  return true;
};

const defaultMimeType = "application/json";

type Plugin = {
  mimeType?: string;
  onCopy?: () => undefined | string;
  onCut?: () => undefined | string;
  onPaste?: (data: string) => boolean | Promise<boolean>;
};

const initPlugins = ({
  plugins,
  signal,
}: {
  plugins: Array<Plugin>;
  signal: AbortSignal;
}) => {
  const handleCopy = (event: ClipboardEvent) => {
    if (validateClipboardEvent(event) === false) {
      return;
    }

    for (const { mimeType = defaultMimeType, onCopy } of plugins) {
      const data = onCopy?.();

      if (data) {
        // must prevent default, otherwise setData() will not work
        event.preventDefault();
        event.clipboardData?.setData(mimeType, data);
        break;
      }
    }
  };

  const handleCut = (event: ClipboardEvent) => {
    if (validateClipboardEvent(event) === false) {
      return;
    }
    for (const { mimeType = defaultMimeType, onCut } of plugins) {
      const data = onCut?.();
      if (data) {
        // must prevent default, otherwise setData() will not work
        event.preventDefault();
        event.clipboardData?.setData(mimeType, data);
        break;
      }
    }
  };

  const handlePaste = (event: ClipboardEvent) => {
    if (validateClipboardEvent(event) === false) {
      return;
    }

    for (const { mimeType = defaultMimeType, onPaste } of plugins) {
      // this shouldn't matter, but just in case
      event.preventDefault();
      const data = event.clipboardData?.getData(mimeType).trim();
      if (data && onPaste?.(data)) {
        break;
      }
    }
  };

  document.addEventListener("copy", handleCopy, { signal });
  document.addEventListener("cut", handleCut, { signal });
  // Capture is required so we get the element before content-editable removes it
  // This way we can detect when we are inside content-editable and ignore the event
  document.addEventListener("paste", handlePaste, { capture: true, signal });
};

export const initCopyPaste = ({ signal }: { signal: AbortSignal }) => {
  initPlugins({
    plugins: [instance, embedTemplate, markdown, webflow],
    signal,
  });
};

export const initCopyPasteForContentEditMode = ({
  signal,
}: {
  signal: AbortSignal;
}) => {
  const handleClipboard = (event: ClipboardEvent) => {
    if (validateClipboardEvent(event) === false) {
      return;
    }

    builderApi.toast.info(
      "Copying and pasting is allowed in design mode only."
    );
  };

  document.addEventListener("copy", handleClipboard, { signal });
  document.addEventListener("cut", handleClipboard, { signal });
  // Capture is required so we get the element before content-editable removes it
  // This way we can detect when we are inside content-editable and ignore the event
  document.addEventListener("paste", handleClipboard, {
    capture: true,
    signal,
  });
};
