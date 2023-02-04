import { PlayIcon } from "@webstudio-is/icons";
import { ToolbarToggle, theme } from "@webstudio-is/design-system";
import { useIsPreviewMode } from "~/shared/nano-states";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    previewMode: boolean;
  }
}

export const PreviewButton = () => {
  const [isPreviewMode, setIsPreviewMode] = useIsPreviewMode();

  return (
    <ToolbarToggle
      aria-label="Toggle Preview"
      css={{
        color: isPreviewMode
          ? theme.colors.foregroundSuccess
          : theme.colors.foregroundContrastMain,
      }}
      onClick={() => setIsPreviewMode(isPreviewMode === false)}
    >
      <PlayIcon />
    </ToolbarToggle>
  );
};
