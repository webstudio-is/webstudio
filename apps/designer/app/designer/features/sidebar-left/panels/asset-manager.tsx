import { ImageIcon } from "~/shared/icons";
import { Button, Flex, Grid, Heading } from "~/shared/design-system";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Form, useSubmit } from "@remix-run/react";
import type { Asset } from "@webstudio-is/prisma-client";
import { AssetManagerImage } from "./components/image";

const readImages = async (fileList: FileList) => {
  const images = [];
  for (const file of fileList) {
    const path = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener("load", (event) => {
        resolve(event?.target?.result);
      });
      reader.readAsDataURL(file);
    });

    images.push({ path, name: file.name, size: file.size, uploading: true });
  }

  return images;
};

export const TabContent = ({
  assets: baseAssets,
}: {
  assets: Array<Asset>;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const submit = useSubmit();
  const [assets, setAssets] = useState(baseAssets);

  useEffect(() => {
    if (baseAssets.length === assets.length) {
      setAssets(baseAssets);
    }
  }, [baseAssets, assets.length]);

  const onFormChange = async (event: ChangeEvent<HTMLFormElement>) => {
    const newFiles = inputRef?.current?.files;
    if (newFiles) {
      submit(event.currentTarget);
      const parsedFiles = await readImages(newFiles);
      setAssets((assets) => [...parsedFiles, ...assets]);

      //event.currentTarget.reset();
    }
  };

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
        {assets.map((asset) => (
          <AssetManagerImage key={asset.id} asset={asset} />
        ))}
      </Grid>
    </Flex>
  );
};

export const icon = <ImageIcon />;
