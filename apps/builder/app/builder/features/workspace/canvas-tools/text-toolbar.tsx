import { useRef, useEffect } from "react";
import { computed } from "nanostores";
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
import {
  $selectedInstanceIntanceToTag,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { type TextToolbarState, $textToolbar } from "~/shared/nano-states";
import { $scale } from "~/builder/shared/nano-states";
import { emitCommand } from "~/builder/shared/commands";

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

const $isWithinLink = computed(
  [$selectedInstanceSelector, $selectedInstanceIntanceToTag],
  (selectedInstanceSelector, selectedInstanceIntanceToTag) => {
    if (
      selectedInstanceSelector === undefined ||
      selectedInstanceIntanceToTag === undefined
    ) {
      return false;
    }
    for (const instanceId of selectedInstanceSelector) {
      const tag = selectedInstanceIntanceToTag.get(instanceId);
      if (tag === "a") {
        return true;
      }
    }
    return false;
  }
);

type ToolbarProps = {
  state: TextToolbarState;
  scale: number;
};

const Toolbar = ({ state, scale }: ToolbarProps) => {
  const isWithinLink = useStore($isWithinLink);

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
      // We use onPointerDown here to prevent the canvas from being inert (see builder.tsx for more details)
      onPointerDown={(event) => {
        // We don't want the logic in the builder to make canvas inert to be triggered
        event.preventDefault();
      }}
    >
      <Tooltip content="Clear styles">
        <IconButton
          aria-label="Clear styles"
          disabled={isCleared}
          onClick={() => emitCommand("formatClear")}
        >
          <CrossSmallIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Bold">
        <IconButton
          aria-label="Bold"
          variant={state.isBold ? "local" : "default"}
          onClick={() => emitCommand("formatBold")}
        >
          <BoldIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Italic">
        <IconButton
          aria-label="Italic"
          variant={state.isItalic ? "local" : "default"}
          onClick={() => emitCommand("formatItalic")}
        >
          <TextItalicIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Superscript">
        <IconButton
          aria-label="Superscript"
          variant={state.isSuperscript ? "local" : "default"}
          onClick={() => emitCommand("formatSuperscript")}
        >
          <SuperscriptIcon />
        </IconButton>
      </Tooltip>

      <Tooltip content="Subscript">
        <IconButton
          aria-label="Subscript"
          variant={state.isSubscript ? "local" : "default"}
          onClick={() => emitCommand("formatSubscript")}
        >
          <SubscriptIcon />
        </IconButton>
      </Tooltip>

      {isWithinLink === false && (
        <Tooltip content="Inline link">
          <IconButton
            aria-label="Inline link"
            variant={state.isLink ? "local" : "default"}
            onClick={() => emitCommand("formatLink")}
          >
            <LinkIcon />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip content="Wrap with span">
        <IconButton
          aria-label="Wrap with span"
          variant={state.isSpan ? "local" : "default"}
          onClick={() => emitCommand("formatSpan")}
        >
          <PaintBrushIcon />
        </IconButton>
      </Tooltip>
    </Flex>
  );
};

export const TextToolbar = () => {
  const textToolbar = useStore($textToolbar);
  const scale = useStore($scale);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);

  if (
    textToolbar?.selectionRect === undefined ||
    selectedInstanceSelector === undefined
  ) {
    return null;
  }

  return <Toolbar state={textToolbar} scale={scale} />;
};
