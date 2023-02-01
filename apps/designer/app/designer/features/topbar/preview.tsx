import { EyeOpenIcon } from "@webstudio-is/icons";
import { Toggle } from "@webstudio-is/design-system";
import { useIsPreviewMode } from "~/shared/nano-states";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    previewMode: boolean;
  }
}

export const PreviewButton = () => {
  const [isPreviewMode, setIsPreviewMode] = useIsPreviewMode();

  return (
    <Toggle
      onPressedChange={setIsPreviewMode}
      pressed={isPreviewMode}
      aria-label="Toggle Preview"
    >
      <EyeOpenIcon />
    </Toggle>
  );
};
