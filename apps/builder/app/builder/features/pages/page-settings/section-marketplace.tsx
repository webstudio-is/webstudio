import { useId } from "react";
import { useStore } from "@nanostores/react";
import {
  Box,
  Button,
  Grid,
  InputField,
  Label,
  Switch,
  theme,
} from "@webstudio-is/design-system";
import { computeExpression } from "@webstudio-is/project-build/runtime/data";
import { ImageControl } from "~/shared/project-settings";
import { $assets } from "~/shared/sync/data-stores";
import { Card } from "../../marketplace/card";
import { ImageInfo } from "../image-info";
import type { OnChange, Values } from "./shared";

export const MarketplaceSection = ({
  values,
  onChange,
}: {
  values: Values;
  onChange: OnChange;
}) => {
  const excludeId = useId();
  const categoryId = useId();
  const categoryMeta = values.customMetas.find(
    ({ property }) => property === "ws:category"
  );
  // @todo remove after all stores are migrated
  const categoryFallback = String(
    computeExpression(categoryMeta?.content ?? `""`, new Map())
  );
  const category = values.marketplace.category ?? categoryFallback ?? "Pages";
  const assets = useStore($assets);
  const thumbnailAsset = assets.get(values.marketplace.thumbnailAssetId);
  const thumnailFallbackAsset = assets.get(values.socialImageAssetId);
  return (
    <Grid gap={2} css={{ padding: theme.panel.padding }}>
      <Grid
        flow="column"
        gap={1}
        justify="start"
        align="center"
        css={{ py: theme.spacing[2] }}
      >
        <Switch
          id={excludeId}
          checked={values.marketplace.include}
          onCheckedChange={(value) =>
            onChange({
              field: "marketplace",
              value: { ...values.marketplace, include: value },
            })
          }
        />
        <Label htmlFor={excludeId}>Include in the marketplace</Label>
      </Grid>
      <Grid gap={1}>
        <Label htmlFor={categoryId}>Category</Label>
        <InputField
          id={categoryId}
          name="marketplaceCategory"
          value={values.marketplace.category}
          onChange={(event) =>
            onChange({
              field: "marketplace",
              value: { ...values.marketplace, category: event.target.value },
            })
          }
        />
      </Grid>
      <Grid gap={1} flow="column">
        <ImageControl
          onAssetIdChange={(value) =>
            onChange({
              field: "marketplace",
              value: { ...values.marketplace, thumbnailAssetId: value },
            })
          }
        >
          <Button color="neutral" css={{ justifySelf: "start" }}>
            Choose thumbnail from assets
          </Button>
        </ImageControl>
      </Grid>
      {thumbnailAsset?.type === "image" && (
        <ImageInfo
          asset={thumbnailAsset}
          onDelete={() =>
            onChange({
              field: "marketplace",
              value: { ...values.marketplace, thumbnailAssetId: "" },
            })
          }
        />
      )}
      <Grid gap={1}>
        <Label>Marketplace preview</Label>
        <Box
          css={{
            padding: theme.spacing[5],
            borderRadius: theme.borderRadius[4],
            border: `1px solid ${theme.colors.borderMain}`,
            justifySelf: "start",
          }}
        >
          <Grid gap={1} css={{ width: theme.spacing[30] }}>
            {category && <Label text="title">{category}</Label>}
            <Card
              title={values.name}
              image={thumbnailAsset ?? thumnailFallbackAsset}
            />
          </Grid>
        </Box>
      </Grid>
    </Grid>
  );
};
