import { useSubscribe, type Publish } from "~/shared/pubsub";
import { EyeOpenIcon } from "@webstudio-is/icons";
import { Toggle } from "@webstudio-is/design-system";
import { useIsPreviewMode } from "~/shared/nano-states";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    previewMode: boolean;
  }
}

type PreviewButtonProps = {
  publish: Publish;
};

export const PreviewButton = ({ publish }: PreviewButtonProps) => {
  const [isPreviewMode, setIsPreviewMode] = useIsPreviewMode();

  const setValue = (value: boolean) => {
    setIsPreviewMode(value);
    publish({
      type: "previewMode",
      payload: value,
    });
  };

  useSubscribe("togglePreviewMode", () => {
    setValue(isPreviewMode === false);
  });

  return (
    <Toggle
      onPressedChange={setValue}
      pressed={isPreviewMode}
      aria-label="Toggle Preview"
    >
      <EyeOpenIcon />
    </Toggle>
  );
};
