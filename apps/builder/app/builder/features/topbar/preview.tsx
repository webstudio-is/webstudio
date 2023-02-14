import { PlayIcon } from "@webstudio-is/icons";
import { ToolbarToggleItem, theme } from "@webstudio-is/design-system";
import { useIsPreviewMode } from "~/shared/nano-states";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    previewMode: boolean;
  }
}

export const PreviewButton = () => {
  const [isPreviewMode, setIsPreviewMode] = useIsPreviewMode();

  return (
    <ToolbarToggleItem
      value="preview"
      aria-label="Toggle Preview"
      css={{
        color: isPreviewMode
          ? theme.colors.foregroundSuccess
          : theme.colors.foregroundContrastMain,
      }}
      onClick={() => setIsPreviewMode(isPreviewMode === false)}
      tabIndex={0}
    >
      <PlayIcon />
    </ToolbarToggleItem>
  );
};
