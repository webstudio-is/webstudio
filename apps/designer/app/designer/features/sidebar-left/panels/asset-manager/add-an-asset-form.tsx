import { Form, useSubmit } from "@remix-run/react";
import ObjectID from "bson-objectid";
import { ChangeEvent, useRef } from "react";
import { Button } from "@webstudio-is/design-system";
import { BaseAsset } from "./types";

const readImages = async (fileList: FileList): Promise<BaseAsset[]> => {
  const images = [];
  for (const file of fileList) {
    const path: string | undefined = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener("load", (event) => {
        const dataUri = event?.target?.result;
        resolve(dataUri ? String(dataUri) : undefined);
      });
      reader.readAsDataURL(file);
    });

    images.push({
      path,
      name: file.name,
      id: ObjectID().toString(),
      status: "uploading" as BaseAsset["status"],
      description: file.name,
      meta: {},
      size: file.size,
    });
  }

  return images;
};

export const AddAnAssetForm = ({
  onSubmit,
}: {
  onSubmit: (uploadedAssets: Array<BaseAsset>) => void;
}) => {
  const submit = useSubmit();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFormChange = async (event: ChangeEvent<HTMLFormElement>) => {
    const newFiles = inputRef?.current?.files;
    if (newFiles) {
      submit(event.currentTarget);
      const parsedFiles = await readImages(newFiles);
      onSubmit(parsedFiles);
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
      >
        Upload Image
      </Button>
    </Form>
  );
};
