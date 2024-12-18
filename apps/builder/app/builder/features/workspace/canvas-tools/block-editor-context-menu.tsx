import { useStore } from "@nanostores/react";
import { styled } from "@webstudio-is/design-system";

import {
  $textEditingInstanceSelector,
  $textEditorContextMenu,
} from "~/shared/nano-states";
import { applyScale } from "./outline";
import { $scale } from "~/builder/shared/nano-states";
import { TemplatesMenu } from "./outline/block-instance-outline";

const TriggerButton = styled("button", {
  position: "absolute",
  appearance: "none",
  backgroundColor: "transparent",
  outline: "none",
  pointerEvents: "all",
  border: "none",
  overflow: "hidden",
  padding: 0,
});

export const TextEditorContextMenu = () => {
  const textEditingInstanceSelector = useStore($textEditingInstanceSelector);
  const textEditorContextMenu = useStore($textEditorContextMenu);
  const scale = useStore($scale);
  // const clampingRect = useStore($clampingRect);

  if (textEditorContextMenu === undefined) {
    return;
  }

  if (textEditingInstanceSelector === undefined) {
    return;
  }
  const rect = applyScale(textEditorContextMenu.cursorRect, scale);

  return (
    <TemplatesMenu
      open={true}
      onOpenChange={(open) => {
        console.log("open", open);
        if (open) {
          return;
        }
        $textEditorContextMenu.set(undefined);
      }}
      anchor={textEditingInstanceSelector.selector}
      triggerTooltipContent={<>"Templates"</>}
    >
      <TriggerButton
        css={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      ></TriggerButton>
    </TemplatesMenu>
  );
};
