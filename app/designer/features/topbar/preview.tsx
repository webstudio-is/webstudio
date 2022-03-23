import { EyeOpenIcon } from "~/shared/icons";
import { SimpleToggle } from "~/shared/design-system";
import { type Publish } from "~/designer/features/canvas-iframe";
import { useIsPreviewMode } from "../../shared/nano-values";

type PreviewProps = {
  publish: Publish;
};

export const Preview = ({ publish }: PreviewProps) => {
  const [isPreviewMode, setIsPreviewMode] = useIsPreviewMode();
  return (
    <SimpleToggle
      onPressedChange={(value) => {
        setIsPreviewMode(value);
        publish<"togglePreviewMode", boolean>({
          type: "togglePreviewMode",
          payload: value,
        });
      }}
      pressed={isPreviewMode}
      aria-label="Toggle Preview"
    >
      <EyeOpenIcon />
    </SimpleToggle>
  );
};
