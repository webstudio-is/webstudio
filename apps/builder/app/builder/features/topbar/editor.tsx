import { useStore } from "@nanostores/react";
import { TextIcon } from "@webstudio-is/icons";
import { ToolbarToggleItem, Tooltip } from "@webstudio-is/design-system";
import { $isContentMode } from "~/shared/nano-states";
import { emitCommand } from "~/builder/shared/commands";

export const EditorButton = () => {
  const isContentMode = useStore($isContentMode);

  return (
    <Tooltip content="Toggle editor">
      <ToolbarToggleItem
        value="editor"
        aria-label="Toggle editor"
        variant="preview"
        data-state={isContentMode ? "on" : "off"}
        onClick={() => emitCommand("toggleEditor")}
        tabIndex={0}
      >
        <TextIcon />
      </ToolbarToggleItem>
    </Tooltip>
  );
};
