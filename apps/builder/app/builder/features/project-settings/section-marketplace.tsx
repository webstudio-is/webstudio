import { useStore } from "@nanostores/react";
import {
  Grid,
  InputField,
  Label,
  theme,
  Text,
  TextArea,
  Separator,
  Button,
  css,
  Flex,
} from "@webstudio-is/design-system";
import { ImageControl } from "./image-control";
import { $assets } from "~/shared/nano-states";
import env from "~/shared/env";
import { Image, createImageLoader } from "@webstudio-is/image";
import { useIds } from "~/shared/form-utils";
import { useState } from "react";
import { Form } from "@remix-run/react";

const imgStyle = css({
  width: 72,
  height: 72,
  borderRadius: theme.borderRadius[4],
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.borderMain,
});

const defaultMarketplaceData: any = {
  name: "",
  thumbnailAssetId: "",
  description: "",
  email: "",
  website: "",
  isSubmitted: false,
};

const imageLoader = createImageLoader({
  imageBaseUrl: env.IMAGE_BASE_URL,
});

export const SectionMarketplace = () => {
  const data = defaultMarketplaceData;
  const ids = useIds([
    "name",
    "thumbnailAssetId",
    "email",
    "website",
    "description",
  ]);
  const assets = useStore($assets);
  const [thumbnailAssetId, setThumbnailAssetId] = useState<string>(
    data.thumbnailAssetId ?? ""
  );
  const asset = assets.get(thumbnailAssetId);
  const thumbnailUrl = asset ? `${asset.name}` : undefined;

  return (
    <Form style={{ display: "contents" }}>
      <Grid
        gap={1}
        css={{
          mx: theme.spacing[5],
          px: theme.spacing[5],
        }}
      >
        <Text variant="titles">Marketplace</Text>
        <Label htmlFor={ids.name}>Product Name</Label>
        <InputField
          id={ids.name}
          defaultValue={data.name ?? ""}
          name="name"
          autoFocus
        />
      </Grid>

      <Separator />

      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <Label>Thumbnail</Label>
        <Grid flow="column" gap={3}>
          <Image
            width={72}
            height={72}
            className={imgStyle()}
            src={thumbnailUrl}
            loader={imageLoader}
          />

          <Grid gap={2}>
            <Text color="subtle">
              Upload a 32 x 32 px image to display in the marketplace overview.
            </Text>
            <ImageControl onAssetIdChange={setThumbnailAssetId}>
              <Button css={{ justifySelf: "start" }}>Upload</Button>
            </ImageControl>
          </Grid>
        </Grid>
      </Grid>

      <Separator />

      <Grid
        gap={1}
        css={{
          mx: theme.spacing[5],
          px: theme.spacing[5],
        }}
      >
        <Label htmlFor={ids.email}>Email</Label>
        <InputField
          id={ids.email}
          defaultValue={data.email ?? ""}
          name="email"
          type="email"
        />
      </Grid>

      <Separator />

      <Grid
        gap={1}
        css={{
          mx: theme.spacing[5],
          px: theme.spacing[5],
        }}
      >
        <Label htmlFor={ids.website}>Website</Label>
        <InputField
          id={ids.website}
          defaultValue={data.website ?? ""}
          name="website"
          type="url"
        />
      </Grid>

      <Separator />

      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <Label htmlFor={ids.description}>Description</Label>
        <TextArea
          id={ids.description}
          rows={5}
          autoGrow
          maxRows={10}
          defaultValue={data.description ?? ""}
        />
      </Grid>

      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <Text color="subtle">
          Once submitted, this project will become available in a public
          marketplace.
        </Text>
      </Grid>

      <Flex
        align="center"
        justify="end"
        gap={2}
        css={{ mx: theme.spacing[5], px: theme.spacing[5] }}
      >
        {data.isSubmitted ? (
          <Button color="destructive" name="remove">
            Remove from marketplace
          </Button>
        ) : (
          <Button color="primary">Submit</Button>
        )}
      </Flex>
    </Form>
  );
};
