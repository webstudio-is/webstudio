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
  CheckboxAndLabel,
  Checkbox,
} from "@webstudio-is/design-system";
import { ImageControl } from "./image-control";
import { $assets, $marketplaceProduct } from "~/shared/nano-states";
import env from "~/shared/env";
import { Image, createImageLoader } from "@webstudio-is/image";
import { useIds } from "~/shared/form-utils";
import { useState } from "react";
import type { MarketplaceProduct } from "@webstudio-is/project-build";
import { serverSyncStore } from "~/shared/sync";

const imgStyle = css({
  width: 72,
  height: 72,
  borderRadius: theme.borderRadius[4],
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: theme.colors.borderMain,
});

const defaultMarketplaceProduct: MarketplaceProduct = {
  category: "templates",
};

const imageLoader = createImageLoader({
  imageBaseUrl: env.IMAGE_BASE_URL,
});

export const SectionMarketplace = () => {
  const marketplaceStatus = undefined;
  const [data, setData] = useState(() => ({
    ...defaultMarketplaceProduct,
    ...$marketplaceProduct.get(),
  }));

  const ids = useIds([
    "name",
    "thumbnailAssetId",
    "email",
    "website",
    "description",
    "isConfirmed",
  ]);
  const assets = useStore($assets);
  const [thumbnailAssetId, setThumbnailAssetId] = useState<string>(
    data.thumbnailAssetId ?? ""
  );
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const asset = assets.get(thumbnailAssetId);
  const thumbnailUrl = asset ? `${asset.name}` : undefined;

  const handleSave = <Setting extends keyof MarketplaceProduct>(
    setting: Setting
  ) => {
    return (value: MarketplaceProduct[Setting]) => {
      const nextData = { ...data, [setting]: value };
      setData(nextData);
      serverSyncStore.createTransaction(
        [$marketplaceProduct],
        (marketplaceProduct) => {
          if (marketplaceProduct === undefined) {
            return;
          }
          Object.assign(marketplaceProduct, nextData);
        }
      );
    };
  };

  return (
    <>
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
          value={data.name ?? ""}
          autoFocus
          onChange={(event) => {
            handleSave("name")(event.target.value);
          }}
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
          value={data.email ?? ""}
          onChange={(event) => {
            handleSave("email")(event.target.value);
          }}
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
          value={data.website ?? ""}
          onChange={(event) => {
            handleSave("website")(event.target.value);
          }}
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
          value={data.description ?? ""}
          onChange={handleSave("description")}
        />
      </Grid>

      <Grid gap={2} css={{ mx: theme.spacing[5], px: theme.spacing[5] }}>
        <CheckboxAndLabel>
          <Checkbox
            checked={isConfirmed}
            id={ids.isConfirmed}
            onCheckedChange={(value) => {
              if (typeof value === "boolean") {
                setIsConfirmed(value);
              }
            }}
          />
          <Label htmlFor={ids.isConfirmed} css={{ flexBasis: "fit-content" }}>
            I understand that by submitting, this project will become available
            in a public marketplace.
          </Label>
        </CheckboxAndLabel>
      </Grid>

      <Flex
        align="center"
        justify="end"
        gap={2}
        css={{ mx: theme.spacing[5], px: theme.spacing[5] }}
      >
        {marketplaceStatus && (
          <Button color="destructive">Remove from marketplace</Button>
        )}
        <Button
          color="primary"
          disabled={isConfirmed === false}
          onClick={() => {}}
        >
          Submit
        </Button>
      </Flex>
    </>
  );
};
