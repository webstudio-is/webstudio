import { type Publish } from "~/shared/pubsub";
import { useMemo, useState, type MouseEventHandler } from "react";
import {
  useSelectedInstanceData,
  type TextToolbarState,
  useTextToolbarState,
} from "~/designer/shared/nano-states";
import { ToggleGroup, type CSS } from "@webstudio-is/design-system";
import { FontBoldIcon, FontItalicIcon, Link2Icon } from "@webstudio-is/icons";
import { useSubscribe } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    showTextToolbar: TextToolbarState;
    hideTextToolbar: void;
    formatTextToolbar: "bold" | "italic" | "link";
  }
}

export const useSubscribeTextToolbar = () => {
  const [, setTextToolbar] = useTextToolbarState();
  useSubscribe("showTextToolbar", setTextToolbar);
  useSubscribe("hideTextToolbar", () => setTextToolbar(null));
};

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
  const top =
    align === "top"
      ? Math.max(selectionRect.y - selectionRect.height, 0)
      : Math.max(selectionRect.y + selectionRect.height);

  return { top, left, marginBottom, marginTop, transform, visibility };
};

type Value = "bold" | "italic" | "link";

const onClickPreventDefault: MouseEventHandler<HTMLDivElement> = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

type ToolbarProps = {
  css?: CSS;
  rootRef: React.Ref<HTMLDivElement>;
  state: TextToolbarState;
  onToggle: (value: Value) => void;
};

const Toolbar = ({ css, rootRef, state, onToggle }: ToolbarProps) => {
  const value: Value[] = [];
  if (state.isBold) {
    value.push("bold");
  }
  if (state.isItalic) {
    value.push("italic");
  }
  if (state.isLink) {
    value.push("link");
  }
  return (
    <ToggleGroup.Root
      ref={rootRef}
      type="multiple"
      value={value}
      onValueChange={(newValues: Value[]) => {
        // @todo refactor with per button callback
        if (state.isBold !== newValues.includes("bold")) {
          onToggle("bold");
        }
        if (state.isItalic !== newValues.includes("italic")) {
          onToggle("italic");
        }
        if (state.isLink !== newValues.includes("link")) {
          onToggle("link");
        }
      }}
      onClick={onClickPreventDefault}
      css={{
        position: "absolute",
        borderRadius: "$1",
        padding: "$spacing$3 $spacing$5",
        pointerEvents: "auto",
        ...css,
      }}
    >
      <ToggleGroup.Item value="bold">
        <FontBoldIcon />
      </ToggleGroup.Item>
      <ToggleGroup.Item value="italic">
        <FontItalicIcon />
      </ToggleGroup.Item>
      <ToggleGroup.Item value="link">
        <Link2Icon />
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  );
};

type TextToolbarProps = {
  publish: Publish;
};

export const TextToolbar = ({ publish }: TextToolbarProps) => {
  const [textToolbar] = useTextToolbarState();
  const [selectedIntsanceData] = useSelectedInstanceData();
  const [element, setElement] = useState<HTMLElement | null>(null);
  const placement = useMemo(() => {
    if (textToolbar == null || element === null) return;
    const toolbarRect = element.getBoundingClientRect();
    return getPlacement({
      toolbarRect,
      selectionRect: textToolbar.selectionRect,
    });
  }, [textToolbar, element]);

  if (textToolbar == null || selectedIntsanceData === undefined) {
    return null;
  }

  return (
    <Toolbar
      rootRef={setElement}
      css={placement}
      state={textToolbar}
      onToggle={(value) =>
        publish({
          type: "formatTextToolbar",
          payload: value,
        })
      }
    />
  );
};
