import { useRef, useEffect } from "react";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { type Publish } from "~/shared/pubsub";
import {
  useSelectedInstanceData,
  type TextToolbarState,
  useTextToolbarState,
} from "~/designer/shared/nano-states";
import { Flex, IconButton, Tooltip } from "@webstudio-is/design-system";
import {
  FontBoldIcon,
  FontItalicIcon,
  SuperscriptIcon,
  SubscriptIcon,
  Link2Icon,
  BrushIcon,
  CrossSmallIcon,
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

  const isCleared =
    state.isBold === false &&
    state.isItalic === false &&
    state.isSuperscript === false &&
    state.isSubscript === false &&
    state.isLink === false &&
    state.isSpan === false;

  return (
    <Flex
      ref={rootRef}
      gap={2}
      css={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "auto",
        background: "$loContrast",
        padding: "$spacing$3",
        borderRadius: "$borderRadius$6",
        border: "1px solid $slate8",
        filter:
          "drop-shadow(0px 2px 7px rgba(0, 0, 0, 0.1)) drop-shadow(0px 5px 17px rgba(0, 0, 0, 0.15))",
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <Tooltip content="Clear styles">
        <IconButton
          aria-label="Clear styles"
          disabled={isCleared}
          onClick={() => onToggle("clear")}
        >
          <CrossSmallIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Bold">
        <IconButton
          aria-label="Bold"
          variant={state.isBold ? "set" : "default"}
          onClick={() => onToggle("bold")}
        >
          <FontBoldIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Italic">
        <IconButton
          aria-label="Italic"
          variant={state.isItalic ? "set" : "default"}
          onClick={() => onToggle("italic")}
        >
          <FontItalicIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Superscript">
        <IconButton
          aria-label="Superscript"
          variant={state.isSuperscript ? "set" : "default"}
          onClick={() => onToggle("superscript")}
        >
          <SuperscriptIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Subscript">
        <IconButton
          aria-label="Subscript"
          variant={state.isSubscript ? "set" : "default"}
          onClick={() => onToggle("subscript")}
        >
          <SubscriptIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Inline link">
        <IconButton
          aria-label="Inline link"
          variant={state.isLink ? "set" : "default"}
          onClick={() => onToggle("link")}
        >
          <Link2Icon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Wrap with span">
        <IconButton
          aria-label="Wrap with span"
          variant={state.isSpan ? "set" : "default"}
          onClick={() => onToggle("span")}
        >
          <BrushIcon />
        </IconButton>
      </Tooltip>
    </Flex>
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
