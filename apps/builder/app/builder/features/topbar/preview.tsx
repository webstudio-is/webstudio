import { useStore } from "@nanostores/react";
import { PlayIcon } from "@webstudio-is/icons";
import { ToolbarToggleItem, Tooltip } from "@webstudio-is/design-system";
import { $isPreviewMode } from "~/shared/nano-states";
import { emitCommand } from "~/builder/shared/commands";

export const PreviewButton = () => {
  const isPreviewMode = useStore($isPreviewMode);

  return (
    <Tooltip content="Toggle preview">
      <ToolbarToggleItem
        value="preview"
        aria-label="Toggle Preview"
        variant="preview"
        data-state={isPreviewMode ? "on" : "off"}
        onClick={() => emitCommand("togglePreview")}
        tabIndex={0}
      >
        <PlayIcon />
      </ToolbarToggleItem>
    </Tooltip>
  );
};
