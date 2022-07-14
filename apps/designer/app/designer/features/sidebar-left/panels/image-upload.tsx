import { ImageIcon } from "~/shared/icons";
import { Button, Flex, Grid, Heading } from "~/shared/design-system";
import { useRef } from "react";
import { Form } from "@remix-run/react";
import { Asset } from "@prisma/client";
import { Image } from "~/shared/design-system/components/image";

export const TabContent = ({ assets }: { assets: Array<Asset> }) => {
  const inputRef = useRef<HTMLInputElement>();
  const formRef = useRef<HTMLFormElement>();
  console.log(assets);
  return (
    <Flex gap="3" direction="column" css={{ padding: "$1" }}>
      <Flex
        css={{
          justifyContent: "space-between",
        }}
      >
        <Heading>Assets</Heading>
        <Form ref={formRef} method="post" encType="multipart/form-data">
          <input
            accept="image/*"
            type="file"
            name="image"
            ref={inputRef}
            onChange={() => formRef.current && formRef.current.submit()}
            style={{ display: "none" }}
          />
          <Button onClick={() => inputRef?.current && inputRef.current.click()}>
            Upload Image
          </Button>
        </Form>
      </Flex>
      <Grid columns={2} gap={2} css={{ "grid-template-rows": "masonry" }}>
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
