import { useSubscribe, type Publish } from "@webstudio-is/sdk";
import { EyeOpenIcon } from "apps/designer/app/shared/icons";
import { SimpleToggle } from "apps/designer/app/shared/design-system";
import { useIsPreviewMode } from "apps/designer/app/shared/nano-states";

type PreviewButtonProps = {
  publish: Publish;
};

export const PreviewButton = ({ publish }: PreviewButtonProps) => {
  const [isPreviewMode, setIsPreviewMode] = useIsPreviewMode();

  const setValue = (value: boolean) => {
    setIsPreviewMode(value);
    publish<"previewMode", boolean>({
      type: "previewMode",
      payload: value,
    });
  };

  useSubscribe<"togglePreviewMode">("togglePreviewMode", () => {
    setValue(!isPreviewMode);
  });

  return (
    <SimpleToggle
      onPressedChange={setValue}
      pressed={isPreviewMode}
      aria-label="Toggle Preview"
    >
      <EyeOpenIcon />
    </SimpleToggle>
  );
};
