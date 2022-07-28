import { useSubscribe, type Publish } from "@webstudio-is/react-sdk";
import { EyeOpenIcon } from "@webstudio-is/icons";
import { SimpleToggle } from "@webstudio-is/design-system";
import { useIsPreviewMode } from "~/shared/nano-states";

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
