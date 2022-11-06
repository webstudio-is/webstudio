import { type Publish } from "~/shared/pubsub";
import { useMemo, useState, type MouseEventHandler } from "react";
import {
  useSelectedInstanceData,
  type TextToolbarValue,
  useTextToolbar,
} from "~/designer/shared/nano-states";
import { ToggleGroup, type CSS } from "@webstudio-is/design-system";
import { FontBoldIcon, FontItalicIcon, Link2Icon } from "@webstudio-is/icons";
import { useSubscribe } from "~/shared/pubsub";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    textToolbarShow: TextToolbarValue;
    textToolbarHide: void;
    textToolbarFormat: "bold" | "italic" | "link";
  }
}

export const useSubscribeTextToolbar = () => {
  const [, setTextToolbar] = useTextToolbar();
  useSubscribe("textToolbarShow", setTextToolbar);
  useSubscribe("textToolbarHide", () => setTextToolbar(null));
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

type Value = "Bold" | "Italic" | "Link";

const onClickPreventDefault: MouseEventHandler<HTMLDivElement> = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

type ToolbarProps = {
  css?: CSS;
  rootRef: React.Ref<HTMLDivElement>;
  textToolbar: TextToolbarValue;
  publish: Publish;
};

const Toolbar = ({ css, rootRef, textToolbar, publish }: ToolbarProps) => {
  const value: Value[] = [];
  if (textToolbar.isBold) {
    value.push("Bold");
  }
  if (textToolbar.isItalic) {
    value.push("Italic");
  }
  if (textToolbar.isLink) {
    value.push("Link");
  }
  return (
    <ToggleGroup.Root
      ref={rootRef}
      type="multiple"
      value={value}
      onValueChange={(newValues: Value[]) => {
        // TODO refactor with per button callback
        if (
          textToolbar.isBold === false &&
          newValues.includes("Bold") === true
        ) {
          publish({
            type: "textToolbarFormat",
            payload: "bold",
          });
        }
        if (
          textToolbar.isItalic === false &&
          newValues.includes("Italic") === true
        ) {
          publish({
            type: "textToolbarFormat",
            payload: "italic",
          });
        }
        if (
          textToolbar.isLink === false &&
          newValues.includes("Link") === true
        ) {
          publish({
            type: "textToolbarFormat",
            payload: "link",
          });
        }
      }}
      onClick={onClickPreventDefault}
      css={{
        position: "absolute",
        borderRadius: "$1",
        padding: "$1 $2",
        pointerEvents: "auto",
        ...css,
      }}
    >
      <ToggleGroup.Item value="Bold">
        <FontBoldIcon />
      </ToggleGroup.Item>
      <ToggleGroup.Item value="Italic">
        <FontItalicIcon />
      </ToggleGroup.Item>
      <ToggleGroup.Item value="Link">
        <Link2Icon />
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  );
};

type TextToolbarProps = {
  publish: Publish;
};

export const TextToolbar = ({ publish }: TextToolbarProps) => {
  const [textToolbar] = useTextToolbar();
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
      textToolbar={textToolbar}
      publish={publish}
    />
  );
};
