import { toastError } from "../error/toast-error";
import { $authTokenPermissions } from "../nano-states";

const isValidClipboardEvent = (event: ClipboardEvent) => {
  const selection = document.getSelection();
  if (selection?.type === "Range") {
    return false;
  }

  // Note on event.target:
  //
  //   The spec (https://w3c.github.io/clipboard-apis/#to-fire-a-clipboard-event)
  //   says that if the context is not editable, the target should be the focused node.
  //
  //   But in practice it seems that the target is based
  //   on where the cursor is, rather than which element has focus.
  //   For example, if a <button> has focus, the target is the <body> element
  //   (at least in Chrome).

  // If cursor is in input,
  // don't copy (we may want to add more exceptions here in the future)
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    (event.target instanceof HTMLElement &&
      event.target.closest("[contenteditable]"))
  ) {
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

export const initCopyPaste = (plugins: Plugin[]) => {
  const handleCopy = async (event: ClipboardEvent) => {
    if ($authTokenPermissions.get().canCopy === false) {
      toastError("Copying has been disabled by the project owner");
      event.preventDefault();
      return;
    }

    if (
      event.clipboardData === null ||
      isValidClipboardEvent(event) === false
    ) {
      return;
    }
    for (const { mimeType = defaultMimeType, onCopy } of plugins) {
      const data = await onCopy?.();
      if (data) {
        // must prevent default, otherwise setData() will not work
        event.preventDefault();
        event.clipboardData.setData(mimeType, data);
        break;
      }
    }
  };

  const handleCut = (event: ClipboardEvent) => {
    if (
      event.clipboardData === null ||
      isValidClipboardEvent(event) === false
    ) {
      return;
    }
    for (const { mimeType = defaultMimeType, onCut } of plugins) {
      const data = onCut?.();
      if (data) {
        // must prevent default, otherwise setData() will not work
        event.preventDefault();
        event.clipboardData.setData(mimeType, data);
        break;
      }
    }
  };

  const handlePaste = (event: ClipboardEvent) => {
    if (
      event.clipboardData === null ||
      // we might want a separate predicate for paste,
      // but for now the logic is the same
      isValidClipboardEvent(event) === false
    ) {
      return;
    }

    for (const { mimeType = defaultMimeType, onPaste } of plugins) {
      // this shouldn't matter, but just in case
      event.preventDefault();
      const data = event.clipboardData.getData(mimeType).trim();
      if (data && onPaste?.(data)) {
        break;
      }
    }
  };

  document.addEventListener("copy", handleCopy);
  document.addEventListener("cut", handleCut);
  // Capture is required so we get the element before content-editable removes it
  // This way we can detect when we are inside content-editable and ignore the event
  document.addEventListener("paste", handlePaste, { capture: true });

  return () => {
    document.removeEventListener("copy", handleCopy);
    document.removeEventListener("cut", handleCut);
    document.removeEventListener("paste", handlePaste, { capture: true });
  };
};
