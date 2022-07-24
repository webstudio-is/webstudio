import { ImageIcon } from "~/shared/icons";
import { Button, Flex, Grid, Heading } from "~/shared/design-system";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Form, useSubmit } from "@remix-run/react";
import type { Asset } from "@webstudio-is/prisma-client";
import { AssetManagerImage } from "./components/image";
import ObjectID from "bson-objectid";

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
      id: ObjectID.toString(),
    });
  }

  return images;
};

type ParsedFiles = {
  path: string;
  name: string;
  id: string;
}[];

export const TabContent = ({ assets }: { assets: Array<Asset> }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const submit = useSubmit();
  const [uploadedImages, setUploadedImages] = useState<ParsedFiles>([]);

  const onFormChange = async (event: ChangeEvent<HTMLFormElement>) => {
    const newFiles = inputRef?.current?.files;
    if (newFiles) {
      submit(event.currentTarget);
      const parsedFiles = await readImages(newFiles);
      setUploadedImages(parsedFiles);

      event.currentTarget.reset();
    }
  };

  useEffect(() => {
    setUploadedImages([]);
  }, [assets?.length]);

  return (
    <Flex gap="3" direction="column" css={{ padding: "$1" }}>
      <Flex justify="between">
        <Heading>Assets</Heading>
        <Form
          method="post"
          encType="multipart/form-data"
          onChange={onFormChange}
        >
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
      </Flex>
      <Grid columns={2} gap={2}>
        {uploadedImages.map((asset) => (
          <AssetManagerImage
            key={asset.id}
            path={asset.path}
            uploading={true}
            alt={asset.name}
          />
        ))}
        {assets.map((asset) => (
          <AssetManagerImage
            key={asset.id}
            path={asset.path}
            alt={asset.alt || asset.name}
          />
        ))}
      </Grid>
    </Flex>
  );
};

export const icon = <ImageIcon />;
