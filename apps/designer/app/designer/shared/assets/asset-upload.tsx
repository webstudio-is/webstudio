import { ChangeEvent, useRef } from "react";
import { Button, Flex, Text } from "@webstudio-is/design-system";
import { UploadIcon } from "@webstudio-is/icons";
import { type AssetType } from "@webstudio-is/asset-uploader";
import { FONT_MIME_TYPES } from "@webstudio-is/fonts";
import { useAssets } from "./use-assets";

const useUpload = (type: AssetType) => {
  const { handleSubmit, Form } = useAssets(type);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onChange = (event: ChangeEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const input = inputRef.current;
    if (input === null) return;
    handleSubmit(input);
    form.reset();
  };

  return { inputRef, onChange, Form };
};

const acceptMap = {
  image: "image/*",
  font: FONT_MIME_TYPES,
};

type AssetUploadProps = {
  type: AssetType;
};

export const AssetUpload = ({ type }: AssetUploadProps) => {
  const { inputRef, onChange, Form } = useUpload(type);
  return (
    <Flex as={Form} css={{ flexGrow: 1 }} onChange={onChange}>
      <input
        accept={acceptMap[type]}
        type="file"
        name={type}
        multiple
        ref={inputRef}
        style={{ display: "none" }}
      />
      <Button
        variant="blue"
        type="button"
        onClick={() => inputRef?.current?.click()}
        css={{ flexGrow: 1 }}
      >
        <Flex align="center" gap={1}>
          <UploadIcon />
          <Text>Upload</Text>
        </Flex>
      </Button>
    </Flex>
  );
};
