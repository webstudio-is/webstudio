import { ImageIcon } from "~/shared/icons";
import { Button, Flex, Grid, Heading } from "~/shared/design-system";
import { useRef } from "react";
import { Form, useSubmit } from "@remix-run/react";
import { type Asset } from "@webstudio-is/prisma-client";
import { Image } from "~/shared/design-system/components/image";

export const TabContent = ({ assets }: { assets: Array<Asset> }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const submit = useSubmit();

  return (
    <Flex gap="3" direction="column" css={{ padding: "$1" }}>
      <Flex justify="between">
        <Heading>Assets</Heading>
        <Form
          method="post"
          encType="multipart/form-data"
          onChange={(event) => {
            if (inputRef.current?.files) {
              submit(event.currentTarget);
              event.currentTarget.reset();
            }
          }}
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
          <Image
            key={asset.id}
            src={asset.path}
            alt={asset.alt || asset.name}
          />
        ))}
      </Grid>
    </Flex>
  );
};

export const icon = <ImageIcon />;
