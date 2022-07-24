import { Form, useSubmit } from "@remix-run/react";
import ObjectID from "bson-objectid";
import { ChangeEvent, useRef } from "react";
import { Button } from "~/shared/design-system";
import { UploadingAsset } from "../../types";

const readImages = async (fileList: FileList) => {
  const images = [];
  for (const file of fileList) {
    const path = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener("load", (event) => {
        const dataUri = event?.target?.result;

        resolve(dataUri);
      });
      reader.readAsDataURL(file);
    });

    images.push({
      path: path as string,
      name: file.name,
      id: ObjectID().toString(),
      uploading: true,
      alt: file.name,
    });
  }

  return images;
};

export const AddAnAssetForm = ({
  onSubmit,
}: {
  onSubmit: (uploadedAssets: Array<UploadingAsset>) => void;
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
      <Button type="button" onClick={() => inputRef?.current?.click()}>
        Upload Image
      </Button>
    </Form>
  );
};
