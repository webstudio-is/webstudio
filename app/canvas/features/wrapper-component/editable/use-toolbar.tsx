import { useState, useEffect } from "react";
import debounce from "lodash.debounce";
import { type Edit } from "./use-editable";
import { publish, useSubscribe } from "@webstudio-is/sdk";
import { useSelectedElement } from "~/canvas/shared/nano-states";

// @todo dedupe with text-toolbar.tsx
type Value = "b" | "i" | "a";

type UseToolbarProps<Item> = {
  editable?: Edit<Item>;
  onInsert: (insert: { type: Value; text: string }) => void;
};

export const useToolbar = <Item extends Record<string, unknown>>({
  editable,
  onInsert,
}: UseToolbarProps<Item>) => {
  const [selectionRect, setRangeRect] = useState<DOMRect | undefined>();
  const [selectedText, setSelectedText] = useState<string | undefined>();
  const [selectedElement] = useSelectedElement();

  const cleanup = () => {
    setSelectedText(undefined);
    setRangeRect(undefined);
  };

  useEffect(() => {
    if (editable === undefined) return;
    // @todo this won't clean up when unmount happens before last callback,
    // use useDebounce
    const onSelect = debounce(() => {
      if (editable === undefined) return;
      // @todo avoid doing serialization
      const state = editable.getState();
      const { position } = state;
      if (position.extent === 0) return cleanup();
      const selection = window.getSelection();
      if (selection === null) return cleanup();
      const range = selection.getRangeAt(0);
      setRangeRect(range.getBoundingClientRect());
      setSelectedText(range.toString());
    }, 50);

    document.addEventListener("selectionchange", onSelect);

    return () => {
      document.removeEventListener("selectionchange", onSelect);
      cleanup();
    };
  }, [editable]);

  useEffect(() => {
    publish({ type: "selectionRect", payload: selectionRect });
  }, [selectionRect]);

  useSubscribe<"insertInlineInstance", Value>(
    "insertInlineInstance",
    (type) => {
      if (selectedText === undefined) return;
      console.log("selected text", selectedText);
      onInsert({ type, text: selectedText });
    }
  );
};
