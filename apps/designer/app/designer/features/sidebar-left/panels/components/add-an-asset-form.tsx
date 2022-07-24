import { Form, useParams, useSubmit } from "@remix-run/react";
import { Asset, Decimal, Location } from "@webstudio-is/prisma-client";
import ObjectID from "bson-objectid";
import { ChangeEvent, useRef } from "react";
import { Button } from "~/shared/design-system";

const readImages = async (fileList: FileList, projectId: string) => {
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
      width: 0 as unknown as Decimal,
      height: 0 as unknown as Decimal,
      projectId,
      size: file.size,
      format: file.type,
      createdAt: new Date(),
      location: "FS" as Location,
      alt: "",
      uploading: true,
    });
  }

  return images;
};

export const AddAnAssetForm = ({
  onSubmit,
}: {
  onSubmit: (uploadedAssets: Array<Asset>) => void;
}) => {
  const submit = useSubmit();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { id } = useParams();

  const onFormChange = async (event: ChangeEvent<HTMLFormElement>) => {
    const newFiles = inputRef?.current?.files;
    if (newFiles && id) {
      submit(event.currentTarget);
      const parsedFiles = await readImages(newFiles, id);
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
