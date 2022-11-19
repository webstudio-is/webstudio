import { useRef, useEffect, type MouseEventHandler } from "react";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { type Publish } from "~/shared/pubsub";
import {
  useSelectedInstanceData,
  type TextToolbarState,
  useTextToolbarState,
} from "~/designer/shared/nano-states";
import { ToggleGroupRoot, ToggleGroupItem } from "@webstudio-is/design-system";
import {
  FontBoldIcon,
  FontItalicIcon,
  SuperscriptIcon,
  SubscriptIcon,
  Link2Icon,
  BrushIcon,
  FormatClearIcon,
} from "@webstudio-is/icons";
import { useSubscribe } from "~/shared/pubsub";

type Format =
  | "bold"
  | "italic"
  | "superscript"
  | "subscript"
  | "link"
  | "span"
  | "clear";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    showTextToolbar: TextToolbarState;
    hideTextToolbar: void;
    formatTextToolbar: Format;
  }
}

export const useSubscribeTextToolbar = () => {
  const [, setTextToolbar] = useTextToolbarState();
  useSubscribe("showTextToolbar", setTextToolbar);
  useSubscribe("hideTextToolbar", () => setTextToolbar(undefined));
};

const onClickPreventDefault: MouseEventHandler<HTMLDivElement> = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

const getRectForRelativeRect = (parent: DOMRect, rel: DOMRect) => {
  return {
    x: parent.x + rel.x,
    y: parent.y + rel.y,
    width: rel.width,
    height: rel.height,
    top: parent.top + rel.top,
    left: parent.left + rel.left,
    bottom: parent.top + rel.bottom,
    right: parent.left + rel.right,
  };
};

type ToolbarProps = {
  state: TextToolbarState;
  onToggle: (value: Format) => void;
};

const Toolbar = ({ state, onToggle }: ToolbarProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (rootRef.current?.parentElement) {
      const floating = rootRef.current;
      const parent = rootRef.current.parentElement;
      const newRect = getRectForRelativeRect(
        parent.getBoundingClientRect(),
        state.selectionRect
      );
      const reference = {
        getBoundingClientRect: () => newRect,
      };
      computePosition(reference, floating, {
        placement: "top",
        middleware: [flip(), shift({ padding: 4 }), offset(12)],
      }).then(({ x, y }) => {
        floating.style.transform = `translate(${x}px, ${y}px)`;
      });
    }
  }, [state.selectionRect]);

  const value: Format[] = [];
  if (state.isBold) {
    value.push("bold");
  }
  if (state.isItalic) {
    value.push("italic");
  }
  if (state.isSuperscript) {
    value.push("superscript");
  }
  if (state.isSubscript) {
    value.push("subscript");
  }
  if (state.isLink) {
    value.push("link");
  }
  if (state.isSpan) {
    value.push("span");
  }

  return (
    <ToggleGroupRoot
      ref={rootRef}
      type="multiple"
      value={value}
      onValueChange={(newValues: Format[]) => {
        // @todo refactor with per button callback
        if (state.isBold !== newValues.includes("bold")) {
          onToggle("bold");
        }
        if (state.isItalic !== newValues.includes("italic")) {
          onToggle("italic");
        }
        if (state.isSuperscript !== newValues.includes("superscript")) {
          onToggle("superscript");
        }
        if (state.isSubscript !== newValues.includes("subscript")) {
          onToggle("subscript");
        }
        if (state.isLink !== newValues.includes("link")) {
          onToggle("link");
        }
        if (state.isSpan !== newValues.includes("span")) {
          onToggle("span");
        }
        if (newValues.includes("clear")) {
          onToggle("clear");
        }
      }}
      onClick={onClickPreventDefault}
      css={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "auto",
        background: "white",
      }}
    >
      <ToggleGroupItem value="bold">
        <FontBoldIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic">
        <FontItalicIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="superscript">
        <SuperscriptIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="subscript">
        <SubscriptIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="link">
        <Link2Icon />
      </ToggleGroupItem>
      <ToggleGroupItem value="span">
        <BrushIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="clear">
        <FormatClearIcon />
      </ToggleGroupItem>
    </ToggleGroupRoot>
  );
};

type TextToolbarProps = {
  publish: Publish;
};

export const TextToolbar = ({ publish }: TextToolbarProps) => {
  const [textToolbar] = useTextToolbarState();
  const [selectedIntsanceData] = useSelectedInstanceData();

  if (textToolbar == null || selectedIntsanceData === undefined) {
    return null;
  }

  return (
    <Toolbar
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
