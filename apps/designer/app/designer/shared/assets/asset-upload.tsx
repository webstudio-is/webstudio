import { Form, useSubmit } from "@remix-run/react";
import ObjectID from "bson-objectid";
import { ChangeEvent, useRef } from "react";
import { Button, Flex, Text } from "@webstudio-is/design-system";
import { UploadIcon } from "@webstudio-is/icons";
import { type AssetType, FONT_FORMATS } from "@webstudio-is/asset-uploader";
import type { PreviewAsset } from "./types";

const readAssets = (fileList: FileList): Promise<PreviewAsset[]> => {
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

const acceptMap = {
  image: "image/*",
  font: FONT_FORMATS.map((format) => `.${format}`).join(", "),
};

type AssetUploadProps = {
  onSubmit: (assets: Array<PreviewAsset>) => void;
  type: AssetType;
};

export const AssetUpload = ({ onSubmit, type }: AssetUploadProps) => {
  const submit = useSubmit();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFormChange = (event: ChangeEvent<HTMLFormElement>) => {
    const newFiles = inputRef?.current?.files;
    if (newFiles) {
      submit(event.currentTarget);
      readAssets(newFiles).then(onSubmit);
      event.currentTarget.reset();
    }
  };

  return (
    <Flex
      as={Form}
      css={{ flexGrow: 1 }}
      method="post"
      encType="multipart/form-data"
      onChange={onFormChange}
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
