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

type Props = {
  mimeType?: string;
  onCopy: () => undefined | string;
  onCut: () => undefined | string;
  onPaste: (data: string) => void;
};

export const initCopyPaste = (props: Props) => {
  const { mimeType = "application/json" } = props;

  const handleCopy = (event: ClipboardEvent) => {
    if (
      event.clipboardData === null ||
      isValidClipboardEvent(event) === false
    ) {
      return;
    }

    const data = props.onCopy();
    if (data === undefined) {
      return;
    }

    // must prevent default, otherwise setData() will not work
    event.preventDefault();
    event.clipboardData.setData(mimeType, data);
  };

  const handleCut = (event: ClipboardEvent) => {
    if (
      event.clipboardData === null ||
      isValidClipboardEvent(event) === false
    ) {
      return;
    }

    const data = props.onCut();
    if (data === undefined) {
      return;
    }

    // must prevent default, otherwise setData() will not work
    event.preventDefault();
    event.clipboardData.setData(mimeType, data);
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

    // this shouldn't matter, but just in case
    event.preventDefault();
    props.onPaste(event.clipboardData.getData(mimeType));
  };

  document.addEventListener("copy", handleCopy);
  document.addEventListener("cut", handleCut);
  document.addEventListener("paste", handlePaste);

  return () => {
    document.removeEventListener("copy", handleCopy);
    document.removeEventListener("cut", handleCut);
    document.removeEventListener("paste", handlePaste);
  };
};
