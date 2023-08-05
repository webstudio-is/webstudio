import { useRef, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { theme, Flex, IconButton, Tooltip } from "@webstudio-is/design-system";
import {
  SuperscriptIcon,
  SubscriptIcon,
  CrossSmallIcon,
  BoldIcon,
  TextItalicIcon,
  LinkIcon,
  PaintBrushIcon,
} from "@webstudio-is/icons";
import { selectedInstanceSelectorStore } from "~/shared/nano-states";
import { type TextToolbarState, textToolbarStore } from "~/shared/nano-states";
import type { Publish } from "~/shared/pubsub";
import { scaleStore } from "~/builder/shared/nano-states";

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
    formatTextToolbar: Format;
  }
}

const getRectForRelativeRect = (
  parent: DOMRect,
  rel: DOMRect,
  scale: number
) => {
  const scaleRatio = scale / 100;
  return {
    x: parent.x + rel.x * scaleRatio,
    y: parent.y + rel.y * scaleRatio,
    width: rel.width * scaleRatio,
    height: rel.height * scaleRatio,
    top: parent.top + rel.top * scaleRatio,
    left: parent.left + rel.left * scaleRatio,
    bottom: parent.top + rel.bottom * scaleRatio,
    right: parent.left + rel.right * scaleRatio,
  };
};

type ToolbarProps = {
  state: TextToolbarState;
  onToggle: (value: Format) => void;
  scale: number;
};

const Toolbar = ({ state, onToggle, scale }: ToolbarProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (state.selectionRect === undefined) {
      return;
    }
    if (rootRef.current?.parentElement) {
      const floating = rootRef.current;
      const parent = rootRef.current.parentElement;
      const newRect = getRectForRelativeRect(
        parent.getBoundingClientRect(),
        state.selectionRect,
        scale
      );
      const reference = {
        getBoundingClientRect: () => newRect,
      };
      computePosition(reference, floating, {
        placement: "top",
        // offset should be first for shift and flip
        // to consider it while detecting overflow
        middleware: [offset(12), shift({ padding: 4 }), flip()],
      }).then(({ x, y }) => {
        floating.style.transform = `translate(${x}px, ${y}px)`;
      });
    }
  }, [state.selectionRect, scale]);

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
        background: theme.colors.backgroundPanel,
        padding: theme.spacing[3],
        borderRadius: theme.borderRadius[6],
        border: `1px solid ${theme.colors.slate8}`,
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
          variant={state.isBold ? "local" : "default"}
          onClick={() => onToggle("bold")}
        >
          <BoldIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Italic">
        <IconButton
          aria-label="Italic"
          variant={state.isItalic ? "local" : "default"}
          onClick={() => onToggle("italic")}
        >
          <TextItalicIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Superscript">
        <IconButton
          aria-label="Superscript"
          variant={state.isSuperscript ? "local" : "default"}
          onClick={() => onToggle("superscript")}
        >
          <SuperscriptIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Subscript">
        <IconButton
          aria-label="Subscript"
          variant={state.isSubscript ? "local" : "default"}
          onClick={() => onToggle("subscript")}
        >
          <SubscriptIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Inline link">
        <IconButton
          aria-label="Inline link"
          variant={state.isLink ? "local" : "default"}
          onClick={() => onToggle("link")}
        >
          <LinkIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Wrap with span">
        <IconButton
          aria-label="Wrap with span"
          variant={state.isSpan ? "local" : "default"}
          onClick={() => onToggle("span")}
        >
          <PaintBrushIcon />
        </IconButton>
      </Tooltip>
    </Flex>
  );
};

type TextToolbarProps = {
  publish: Publish;
};

export const TextToolbar = ({ publish }: TextToolbarProps) => {
  const textToolbar = useStore(textToolbarStore);
  const scale = useStore(scaleStore);
  const selectedInstanceSelector = useStore(selectedInstanceSelectorStore);

  if (
    textToolbar?.selectionRect === undefined ||
    selectedInstanceSelector === undefined
  ) {
    return null;
  }

  return (
    <Toolbar
      state={textToolbar}
      scale={scale}
      onToggle={(value) =>
        publish({
          type: "formatTextToolbar",
          payload: value,
        })
      }
    />
  );
};
