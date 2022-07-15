import { ImageIcon } from "~/shared/icons";
import { Button, Flex, Grid, Heading } from "~/shared/design-system";
import React, { useRef } from "react";
import { Form } from "@remix-run/react";
import { Asset } from "@prisma/client";
import { Image } from "~/shared/design-system/components/image";

export const TabContent = ({ assets }: { assets: Array<Asset> }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);

  const onChange = () => {
    if (submitButtonRef.current) {
      submitButtonRef.current.click();
    }
  };

  return (
    <Flex gap="3" direction="column" css={{ padding: "$1" }}>
      <Flex
        css={{
          justifyContent: "space-between",
        }}
      >
        <Heading>Assets</Heading>
        <Form method="post" encType="multipart/form-data">
          <input
            accept="image/*"
            type="file"
            name="image"
            ref={inputRef}
            onChange={onChange}
            style={{ display: "none" }}
          />
          <button
            ref={submitButtonRef}
            type="submit"
            style={{ display: "none" }}
          />
          <Button onClick={() => inputRef?.current && inputRef.current.click()}>
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
