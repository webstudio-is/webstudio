import { useState, useEffect, type MouseEventHandler } from "react";
import debounce from "lodash.debounce";
import { useLayoutEffect } from "@radix-ui/react-use-layout-effect";
import {
  Portal,
  ToggleGroup,
  darkTheme,
  type CSS,
} from "~/shared/design-system";
import { FontBoldIcon, FontItalicIcon, Link2Icon } from "~/shared/icons";
import { type Edit } from "./use-editable";

export type Value = "b" | "i" | "a";

type ToolbarProps = {
  css?: CSS;
  onValueChange: (value: Value) => void;
  rootRef: React.Ref<HTMLDivElement>;
};

const onClickPreventDefault: MouseEventHandler<HTMLDivElement> = (event) => {
  event.preventDefault();
};

const Toolbar = ({ css, onValueChange, rootRef }: ToolbarProps) => {
  return (
    <Portal.Root className={darkTheme}>
      <ToggleGroup.Root
        ref={rootRef}
        type="single"
        onValueChange={onValueChange}
        onClick={onClickPreventDefault}
        css={{
          position: "absolute",
          borderRadius: "$1",
          padding: "$1 $2",
          ...css,
        }}
      >
        <ToggleGroup.Item value="b">
          <FontBoldIcon />
        </ToggleGroup.Item>
        <ToggleGroup.Item value="i">
          <FontItalicIcon />
        </ToggleGroup.Item>
        <ToggleGroup.Item value="a">
          <Link2Icon />
        </ToggleGroup.Item>
      </ToggleGroup.Root>
    </Portal.Root>
  );
};

const getPlacement = ({
  rootRect,
  rangeRect,
}: {
  rootRect?: DOMRect;
  rangeRect: DOMRect;
}) => {
  let align = "top";
  let left = rangeRect.x + rangeRect.width / 2;
  // We measure the size in a hidden state after we render the menu,
  // then show it
  let visibility = "hidden";
  if (rootRect !== undefined) {
    visibility = "visible";
    // Prevent going further than left 0
    left = Math.max(left, rootRect.width / 2);
    // Prevent going further than window width
    left = Math.min(left, window.innerWidth - rootRect.width / 2);
    align = rangeRect.y > rootRect.height ? "top" : "bottom";
  }

  const marginBottom = align === "bottom" ? "-$5" : 0;
  const marginTop = align === "bottom" ? 0 : "-$5";
  const transform = "translateX(-50%)";
  let top =
    align === "top"
      ? Math.max(rangeRect.y - rangeRect.height, 0)
      : Math.max(rangeRect.y + rangeRect.height);
  top += window.pageYOffset;
  return { top, left, marginBottom, marginTop, transform, visibility };
};

type UseToolbarProps<Item> = {
  editable?: Edit<Item>;
  onInsert: (insert: { type: Value; text: string }) => void;
};

export const useToolbar = <Item extends Record<string, unknown>>({
  editable,
  onInsert,
}: UseToolbarProps<Item>) => {
  const [rangeRect, setRangeRect] = useState<DOMRect | undefined>();
  const [selectedText, setSelectedText] = useState<string | undefined>();
  const [placement, setPlacement] = useState<CSS | undefined>();
  const [element, setElement] = useState<HTMLElement | null>(null);

  const cleanup = () => {
    setSelectedText(undefined);
    setRangeRect(undefined);
    setPlacement(undefined);
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

  useLayoutEffect(() => {
    if (element === null || rangeRect === undefined) {
      return;
    }
    const rootRect = element.getBoundingClientRect();
    const placement = getPlacement({ rootRect, rangeRect });
    setPlacement(placement);
  }, [rangeRect, element]);

  if (rangeRect === undefined) return null;

  return (
    <Toolbar
      rootRef={setElement}
      css={placement}
      onValueChange={(type) => {
        if (selectedText === undefined) return;
        onInsert({ type, text: selectedText });
      }}
    />
  );
};
