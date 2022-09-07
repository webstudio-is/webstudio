import { Form, useSubmit } from "@remix-run/react";
import ObjectID from "bson-objectid";
import { ChangeEvent, useRef } from "react";
import { Button, Flex, Text } from "@webstudio-is/design-system";
import { BaseAsset } from "../../features/sidebar-left/panels/asset-manager/types";
import { UploadIcon } from "@webstudio-is/icons";

const readAssets = (fileList: FileList): Promise<BaseAsset[]> => {
  const assets: Array<Promise<BaseAsset>> = Array.from(fileList).map(
    (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.addEventListener("load", (event) => {
          const dataUri = event?.target?.result;
          const path = dataUri ? String(dataUri) : undefined;
          resolve({
            path,
            name: file.name,
            id: ObjectID().toString(),
            status: "uploading" as BaseAsset["status"],
            alt: file.name,
            size: file.size,
          });
        });
        reader.readAsDataURL(file);
      })
  );

  return Promise.all(assets);
};

export const AssetUpload = ({
  onSubmit,
}: {
  onSubmit: (uploadedAssets: Array<BaseAsset>) => void;
}) => {
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
    <Form method="post" encType="multipart/form-data" onChange={onFormChange}>
      <input
        accept="image/*"
        type="file"
        name="image"
        multiple
        ref={inputRef}
        style={{ display: "none" }}
      />
      <Button
        variant="blue"
        type="button"
        onClick={() => inputRef?.current?.click()}
        size={2}
      >
        <Flex align="center" gap={1}>
          <UploadIcon />
          <Text>Upload</Text>
        </Flex>
      </Button>
    </Form>
  );
};
