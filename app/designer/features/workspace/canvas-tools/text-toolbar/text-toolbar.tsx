import { type Publish } from "@webstudio-is/sdk";
import { useMemo, useState, type MouseEventHandler } from "react";
import { useSelectionRect } from "~/designer/shared/nano-states";
import { ToggleGroup, type CSS } from "~/shared/design-system";
import { FontBoldIcon, FontItalicIcon, Link2Icon } from "~/shared/icons";

const getPlacement = ({
  toolbarRect,
  selectionRect,
}: {
  toolbarRect?: DOMRect;
  selectionRect: DOMRect;
}) => {
  let align = "top";
  let left = selectionRect.x + selectionRect.width / 2;
  // We measure the size in a hidden state after we render the menu,
  // then show it
  let visibility = "hidden";
  if (toolbarRect !== undefined) {
    visibility = "visible";
    // Prevent going further than left 0
    left = Math.max(left, toolbarRect.width / 2);
    // Prevent going further than window width
    left = Math.min(left, window.innerWidth - toolbarRect.width / 2);
    align = selectionRect.y > toolbarRect.height ? "top" : "bottom";
  }

  const marginBottom = align === "bottom" ? "-$5" : 0;
  const marginTop = align === "bottom" ? 0 : "-$5";
  const transform = "translateX(-50%)";
  let top =
    align === "top"
      ? Math.max(selectionRect.y - selectionRect.height, 0)
      : Math.max(selectionRect.y + selectionRect.height);
  // @todo this has to come from canvas
  top += window.pageYOffset;
  return { top, left, marginBottom, marginTop, transform, visibility };
};

// @todo dedupe with use-toolbar.tsx
type Value = "b" | "i" | "a";

const onClickPreventDefault: MouseEventHandler<HTMLDivElement> = (event) => {
  console.log(event);
  event.preventDefault();
};

type ToolbarProps = {
  css?: CSS;
  onValueChange: (value: Value) => void;
  rootRef: React.Ref<HTMLDivElement>;
};

const Toolbar = ({ css, onValueChange, rootRef }: ToolbarProps) => {
  return (
    <ToggleGroup.Root
      ref={rootRef}
      type="single"
      onValueChange={onValueChange}
      onClick={onClickPreventDefault}
      css={{
        position: "absolute",
        borderRadius: "$1",
        padding: "$1 $2",
        pointerEvents: "auto",
        ...css,
      }}
    >
      <ToggleGroup.Item value="b">
        <FontBoldIcon style={{ pointerEvents: "auto" }} />
      </ToggleGroup.Item>
      <ToggleGroup.Item value="i">
        <FontItalicIcon />
      </ToggleGroup.Item>
      <ToggleGroup.Item value="a">
        <Link2Icon />
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  );
};

type TextToolbarProps = {
  publish: Publish;
};

export const TextToolbar = ({ publish }: TextToolbarProps) => {
  const [selectionRect] = useSelectionRect();
  const [element, setElement] = useState<HTMLElement | null>(null);
  console.log({ selectionRect });
  const placement = useMemo(() => {
    if (selectionRect === undefined || element === null) return;
    const toolbarRect = element.getBoundingClientRect();
    return getPlacement({ toolbarRect, selectionRect });
  }, [selectionRect, element]);

  if (selectionRect === undefined) return null;

  return (
    <Toolbar
      rootRef={setElement}
      css={placement}
      onValueChange={(type) => {
        publish({ type: "insertInlineInstance", payload: type });
      }}
    />
  );
};
