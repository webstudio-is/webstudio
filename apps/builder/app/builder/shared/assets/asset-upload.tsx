import { ChangeEvent, useRef } from "react";
import { Button, Flex, Tooltip } from "@webstudio-is/design-system";
import { UploadIcon } from "@webstudio-is/icons";
import type { AssetType } from "@webstudio-is/asset-uploader";
import { FONT_MIME_TYPES } from "@webstudio-is/fonts";
import { useAssets } from "./use-assets";
import { useAuthPermit } from "~/shared/nano-states";

const useUpload = (type: AssetType) => {
  const { handleSubmit } = useAssets(type);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onChange = (event: ChangeEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const input = inputRef.current;
    if (input === null) {
      return;
    }
    handleSubmit(input);
    form.reset();
  };

  return { inputRef, onChange };
};

const acceptMap = {
  image: "image/*",
  font: FONT_MIME_TYPES,
};

type AssetUploadProps = {
  type: AssetType;
};

export const AssetUpload = ({ type }: AssetUploadProps) => {
  const { inputRef, onChange } = useUpload(type);
  const [authPermit] = useAuthPermit();

  const isUploadDisabled = authPermit === "view";
  const tooltipContent = isUploadDisabled
    ? "View mode. You can't upload assets."
    : undefined;

  return (
    <form onChange={onChange}>
      <Flex>
        <input
          accept={acceptMap[type]}
          type="file"
          name={type}
          multiple
          ref={inputRef}
          style={{ display: "none" }}
        />
        <Tooltip side="bottom" content={tooltipContent}>
          <Button
            type="button"
            onClick={() => inputRef?.current?.click()}
            css={{ flexGrow: 1 }}
            prefix={<UploadIcon />}
            disabled={isUploadDisabled}
          >
            Upload
          </Button>
        </Tooltip>
      </Flex>
    </form>
  );
};
