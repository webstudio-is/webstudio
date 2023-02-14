import { z } from "zod";

const isValidClipboardEvent = (
  event: ClipboardEvent,
  options: { allowAnyTarget: boolean }
) => {
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
    options.allowAnyTarget === false &&
    (event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement)
  ) {
    return false;
  }

  return true;
};

type Props<Data> = {
  version: string;
  type: z.ZodType<Data>;
  allowAnyTarget?: boolean;
  onCopy: () => undefined | Data;
  onCut: () => undefined | Data;
  onPaste: (data: Data) => void;
};

export const startCopyPaste = <Type>(props: Props<Type>) => {
  const { version, type, allowAnyTarget = false } = props;
  const versionLiteral = version;

  const DataType = z.object({ [versionLiteral]: type });

  const serialize = (data: Type) => {
    return JSON.stringify({ [versionLiteral]: data });
  };

  const deserialize = (text: string) => {
    try {
      const data = DataType.parse(JSON.parse(text));
      // zod provides invalid type without versionLiteral
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any)[versionLiteral] as Type;
    } catch {
      return;
    }
  };

  const handleCopy = (event: ClipboardEvent) => {
    if (
      event.clipboardData === null ||
      isValidClipboardEvent(event, { allowAnyTarget }) === false
    ) {
      return;
    }

    const data = props.onCopy();
    if (data === undefined) {
      return;
    }

    // must prevent default, otherwise setData() will not work
    event.preventDefault();
    event.clipboardData.setData("application/json", serialize(data));
  };

  const handleCut = (event: ClipboardEvent) => {
    if (
      event.clipboardData === null ||
      isValidClipboardEvent(event, { allowAnyTarget }) === false
    ) {
      return;
    }

    const data = props.onCut();
    if (data === undefined) {
      return;
    }

    // must prevent default, otherwise setData() will not work
    event.preventDefault();
    event.clipboardData.setData("application/json", serialize(data));
  };

  const handlePaste = (event: ClipboardEvent) => {
    if (
      event.clipboardData === null ||
      // we might want a separate predicate for paste,
      // but for now the logic is the same
      isValidClipboardEvent(event, { allowAnyTarget }) === false
    ) {
      return;
    }

    // this shouldn't matter, but just in case
    event.preventDefault();
    const data = deserialize(event.clipboardData.getData("application/json"));
    if (data === undefined) {
      return;
    }

    props.onPaste(data);
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
