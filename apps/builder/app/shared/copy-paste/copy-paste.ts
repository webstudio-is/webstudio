import { toastError } from "../error/toast-error";
import {
  $authTokenPermissions,
  $textEditingInstanceSelector,
} from "../nano-states";
import { instanceText, instanceJson } from "./plugin-instance";
import {
  pageText,
  copyFolderData,
  copyPageData,
  copyTemplateData,
  handlePastePage,
} from "./plugin-page";
import { html } from "./plugin-html";
import { jsx } from "./plugin-jsx";
import { markdown } from "./plugin-markdown";
import { webflow } from "./plugin-webflow/plugin-webflow";
import { builderApi } from "../builder-api";
import { readClipboardText } from "../clipboard";

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

  // Allows native selection of text in the Builder panels, such as CSS preview.
  if (event.type === "copy") {
    const isInBuilderContext = window.self === window.top;
    const selection = window.getSelection();

    if (isInBuilderContext && selection && selection.isCollapsed === false) {
      return false;
    }
  }

  return validateCopyPermission();
};

const validateCopyPermission = () => {
  if ($authTokenPermissions.get().canCopy === false) {
    toastError("Copying has been disabled by the project owner");
    return false;
  }
  return true;
};

export type Plugin = {
  name: string;
  mimeType: string;
  onCopy?: () => undefined | string;
  onCut?: () => undefined | string;
  onPaste?: (data: string) => PasteResult | Promise<PasteResult>;
};

export type PasteResult =
  | { success: true; data: { handled: false } }
  | { success: true; data: { handled: true } }
  | { success: false; error: string };

export const pasteIgnored: PasteResult = {
  success: true,
  data: { handled: false },
};

export const pasteHandled: PasteResult = {
  success: true,
  data: { handled: true },
};

const isPasteHandled = (result: PasteResult) =>
  result.success === false || result.data.handled;

const reportPasteResult = (result: PasteResult) => {
  if (result.success === false) {
    builderApi.toast.error(result.error);
  }
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

    for (const { mimeType, onCopy } of plugins) {
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
    for (const { mimeType, onCut } of plugins) {
      const data = onCut?.();
      if (data) {
        // must prevent default, otherwise setData() will not work
        event.preventDefault();
        event.clipboardData?.setData(mimeType, data);
        break;
      }
    }
  };

  const handlePaste = async (event: ClipboardEvent) => {
    if (validateClipboardEvent(event) === false) {
      return;
    }
    event.preventDefault();

    for (const { mimeType, onPaste } of plugins) {
      if (onPaste === undefined) {
        continue;
      }
      const data = event.clipboardData?.getData(mimeType).trim();
      if (data === undefined || data === "") {
        continue;
      }
      const result = await onPaste(data);
      if (isPasteHandled(result)) {
        reportPasteResult(result);
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
    plugins: [
      pageText,
      instanceJson,
      instanceText,
      jsx,
      html,
      markdown,
      webflow,
    ],
    signal,
  });
};

export const initCopyPasteForContentEditMode = ({
  signal,
}: {
  signal: AbortSignal;
}) => {
  const showUnsupportedCopyMessage = () => {
    builderApi.toast.info("This selection cannot be copied here.");
  };

  const showUnsupportedPasteMessage = () => {
    builderApi.toast.info("This clipboard data cannot be pasted here.");
  };

  const showCutDesignModeOnlyMessage = () => {
    builderApi.toast.info("Cutting is allowed in design mode only.");
  };

  const handleCopy = (event: ClipboardEvent) => {
    if (validateClipboardEvent(event) === false) {
      return;
    }
    const data = instanceText.onCopy?.();
    if (data) {
      event.preventDefault();
      event.clipboardData?.setData(instanceText.mimeType, data);
      return;
    }
    showUnsupportedCopyMessage();
  };

  const handlePaste = async (event: ClipboardEvent) => {
    if (validateClipboardEvent(event) === false) {
      return;
    }
    const jsonData = event.clipboardData?.getData(instanceJson.mimeType).trim();
    if (jsonData) {
      event.preventDefault();
      const result = await instanceJson.onPaste(jsonData);
      if (isPasteHandled(result)) {
        reportPasteResult(result);
        return;
      }
      showUnsupportedPasteMessage();
      return;
    }
    const textData = event.clipboardData?.getData(instanceText.mimeType).trim();
    if (textData) {
      event.preventDefault();
      const result = await instanceText.onPaste(textData);
      if (isPasteHandled(result)) {
        reportPasteResult(result);
        return;
      }
      showUnsupportedPasteMessage();
      return;
    }
    showUnsupportedPasteMessage();
  };

  const handleCut = (event: ClipboardEvent) => {
    if (validateClipboardEvent(event) === false) {
      return;
    }
    showCutDesignModeOnlyMessage();
  };

  document.addEventListener("copy", handleCopy, { signal });
  document.addEventListener("cut", handleCut, { signal });
  // Capture is required so we get the element before content-editable removes it
  // This way we can detect when we are inside content-editable and ignore the event
  document.addEventListener("paste", handlePaste, {
    capture: true,
    signal,
  });
};

const writeClipboardText = (data: string | undefined) => {
  if (data && validateCopyPermission()) {
    return navigator.clipboard.writeText(data);
  }
  return Promise.resolve();
};

// Public API for programmatic copy/paste/cut operations
export const copyInstance = () => {
  return writeClipboardText(instanceText.onCopy?.());
};

export const copyPage = (pageId: string) => {
  return writeClipboardText(copyPageData(pageId));
};

export const copyFolder = (folderId: string) => {
  return writeClipboardText(copyFolderData(folderId));
};

export const copyTemplate = (templateId: string) => {
  return writeClipboardText(copyTemplateData(templateId));
};

export const pastePage = async (targetFolderId?: string) => {
  const text = await readClipboardText();
  if (text === undefined) {
    return false;
  }
  const result = await handlePastePage(text, targetFolderId);
  reportPasteResult(result);
  return isPasteHandled(result);
};

export const emitPaste = async () => {
  const text = await readClipboardText();
  if (text === undefined) {
    return;
  }

  // Create and dispatch a paste event to go through the normal handlePaste flow
  const dataTransfer = new DataTransfer();
  dataTransfer.setData("text/plain", text);

  const pasteEvent = new ClipboardEvent("paste", {
    clipboardData: dataTransfer,
    bubbles: true,
    cancelable: true,
  });

  document.dispatchEvent(pasteEvent);
};

export const cutInstance = () => {
  return writeClipboardText(instanceText.onCut?.());
};
