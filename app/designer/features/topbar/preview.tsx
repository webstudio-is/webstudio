import { EyeOpenIcon } from "~/shared/icons";
import { SimpleToggle } from "~/shared/design-system";
import { useSubscribe, type Publish } from "~/designer/shared/canvas-iframe";
import { useIsPreviewMode } from "../../shared/nano-values";

type PreviewProps = {
  publish: Publish;
};

export const Preview = ({ publish }: PreviewProps) => {
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
