import { Box, Grid, Label, css, theme } from "@webstudio-is/design-system";
import { getImageAttributes, wsImageLoader } from "@webstudio-is/image";
import { truncateByWords, truncate } from "./social-utils";

type SocialPreviewProps = {
  ogImageUrl?: string;
  ogUrl: string;
  ogTitle: string;
  ogDescription: string;
};

// Social previews represent an external light surface, not Builder UI.
const socialPreviewColors = {
  background: "#fff",
  imagePlaceholder: "#dfe3e6",
  border: "#e6e6e6",
  foreground: "#18283e",
  foregroundSecondary: "#4d5156",
} as const;

const imgStyle = css({
  borderTopLeftRadius: theme.borderRadius[4],
  borderTopRightRadius: theme.borderRadius[4],
  width: "100%",
  aspectRatio: "1.91",
  background: socialPreviewColors.imagePlaceholder,
  borderBottom: `1px solid ${socialPreviewColors.border}`,
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
  return (
    <Grid gap={1}>
      <Label>Social sharing preview</Label>

      <Grid
        gap={1}
        css={{
          borderRadius: theme.borderRadius[4],
          border: `1px solid ${socialPreviewColors.border}`,
          backgroundColor: socialPreviewColors.background,
        }}
      >
        <img
          className={imgStyle({
            hasImage:
              ogImageUrl === undefined || ogImageUrl === "" ? false : true,
          })}
          {...getImageAttributes({
            alt: "Social sharing preview image",
            src: ogImageUrl,
            loader: wsImageLoader,
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
              color: socialPreviewColors.foregroundSecondary,
              fontFamily: "Arial",
              fontSize: "12px",
              lineHeight: "16px",
            }}
          >
            {truncate(ogUrl)}
          </Box>
          <Box
            css={{
              color: socialPreviewColors.foreground,
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
              color: socialPreviewColors.foregroundSecondary,
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
