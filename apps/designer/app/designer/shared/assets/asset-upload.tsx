import { Form, useActionData } from "@remix-run/react";
import ObjectID from "bson-objectid";
import { ChangeEvent, useEffect, useRef } from "react";
import { Button, Flex, Text } from "@webstudio-is/design-system";
import { UploadIcon } from "@webstudio-is/icons";
import { type AssetType } from "@webstudio-is/asset-uploader";
import type { ActionData, PreviewAsset } from "./types";
import { FONT_MIME_TYPES } from "@webstudio-is/fonts";
import { useSerialSubmit } from "./use-serial-submit";

const toPreviewAssets = (fileList: FileList): Promise<PreviewAsset[]> => {
  const assets: Array<Promise<PreviewAsset>> = Array.from(fileList).map(
    (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", (event) => {
          const dataUri = event?.target?.result;
          if (dataUri === undefined) {
            return reject(new Error("Could not read file"));
          }

          resolve({
            format: file.type.split("/")[1],
            path: String(dataUri),
            name: file.name,
            id: ObjectID().toString(),
            status: "uploading",
          });
        });
        reader.readAsDataURL(file);
      })
  );

  return Promise.all(assets);
};

const useUpload = ({
  onSubmit,
  onActionData,
}: {
  onActionData: (data: ActionData) => void;
  onSubmit: (assets: Array<PreviewAsset>) => void;
}) => {
  const submit = useSerialSubmit();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const actionData: ActionData | undefined = useActionData();

  const onChange = (event: ChangeEvent<HTMLFormElement>) => {
    const files = inputRef?.current?.files;
    if (files && files.length !== 0) {
      submit(event.currentTarget);
      toPreviewAssets(files).then(onSubmit);
      event.currentTarget.reset();
    }
  };

  useEffect(() => {
    if (actionData !== undefined) {
      onActionData(actionData);
    }
  }, [actionData, onActionData]);

  return { inputRef, onChange };
};

const acceptMap = {
  image: "image/*",
  font: FONT_MIME_TYPES,
};

type AssetUploadProps = {
  onActionData: (data: ActionData) => void;
  onSubmit: (assets: Array<PreviewAsset>) => void;
  type: AssetType;
};

export const AssetUpload = ({
  onSubmit,
  onActionData,
  type,
}: AssetUploadProps) => {
  const { inputRef, onChange } = useUpload({ onSubmit, onActionData });
  return (
    <Flex
      as={Form}
      css={{ flexGrow: 1 }}
      method="post"
      encType="multipart/form-data"
      onChange={onChange}
    >
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
        size={2}
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
