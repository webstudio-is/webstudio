import { Box, Grid, Label, css, theme } from "@webstudio-is/design-system";
import { Image } from "@webstudio-is/image";
import { truncateByWords, truncate } from "./social-utils";
import { useStore } from "@nanostores/react";
import { $imageLoader } from "~/shared/nano-states";

type SocialPreviewProps = {
  ogImageUrl?: string;
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
  ogImageUrl,
  ogDescription,
  ogTitle,
  ogUrl,
}: SocialPreviewProps) => {
  const imageLoader = useStore($imageLoader);

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
          src={ogImageUrl}
          loader={imageLoader}
          className={imgStyle({
            hasImage: ogImageUrl !== undefined ? true : undefined,
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
