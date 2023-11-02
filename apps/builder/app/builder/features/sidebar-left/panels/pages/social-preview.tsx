import { Box, Grid, Label, css, theme } from "@webstudio-is/design-system";
import { Image, createImageLoader } from "@webstudio-is/image";
import type { ImageAsset } from "@webstudio-is/sdk";
import env from "~/shared/env";
import { truncateByWords, truncate } from "./social-utils";

type SocialPreviewProps = {
  asset?: ImageAsset;
  ogUrl: string;
  ogTitle: string;
  ogDescription: string;
};

const imgStyle = css({
  borderTopLeftRadius: theme.borderRadius[4],
  borderTopRightRadius: theme.borderRadius[4],
  width: "100%",
  aspectRatio: "1.91 / 1",
  background: "#DFE3E6",
  borderBottom: `1px solid ${theme.colors.borderMain}`,
  variants: {
    hasImage: {
      true: {
        objectFit: "cover",
      },
    },
  },
});

export const SocialPreview = ({
  asset,
  ogDescription,
  ogTitle,
  ogUrl,
}: SocialPreviewProps) => {
  const imageLoader = createImageLoader({
    imageBaseUrl: env.ASSET_BASE_URL,
  });

  return (
    <Grid gap={1}>
      <Label>Social Sharing Preview</Label>

      <Grid
        gap={1}
        css={{
          borderRadius: theme.borderRadius[4],
          border: `1px solid ${theme.colors.borderMain}`,
          backgroundColor: theme.colors.white,
        }}
      >
        <Image
          src={asset?.type === "image" ? asset.name : undefined}
          loader={imageLoader}
          className={imgStyle({
            hasImage: asset?.type === "image" ? true : undefined,
          })}
        />

        <Grid
          gap={1}
          css={{
            margin: 12,
          }}
        >
          <Box
            css={{
              color: "#4D5156",
              fontFamily: "Arial",
              fontSize: "12px",
              lineHeight: "16px",
            }}
          >
            {truncate(ogUrl)}
          </Box>
          <Box
            css={{
              color: "#18283E",
              fontFamily: "Arial",
              fontSize: "14px",
              fontWeight: 700,
              lineHeight: "18px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {truncateByWords(ogTitle, 60)}
          </Box>
          <Box
            css={{
              color: "#4D5156",
              fontFamily: "Arial",
              fontSize: "12px",
              fontWeight: 400,
              lineHeight: "16px",
              "-webkit-line-clamp": 2,
              display: "-webkit-box",
              "-webkit-box-orient": "vertical",
              overflow: "hidden",
            }}
          >
            {truncateByWords(ogDescription)}
          </Box>
        </Grid>
      </Grid>
    </Grid>
  );
};
