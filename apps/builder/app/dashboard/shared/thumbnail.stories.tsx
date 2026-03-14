import { Box, theme } from "@webstudio-is/design-system";
import { ThumbnailWithAbbr, ThumbnailLinkWithAbbr } from "./thumbnail";

export default {
  title: "Dashboard/Thumbnail",
};

const ThumbnailWrapper = ({ children }: { children: React.ReactNode }) => (
  <Box
    css={{
      width: theme.spacing[30],
      aspectRatio: "1.91/1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: theme.colors.brandBackgroundProjectCardFront,
    }}
  >
    {children}
  </Box>
);

export const Abbreviation = () => (
  <ThumbnailWrapper>
    <ThumbnailWithAbbr title="My Next Project" onClick={() => {}} />
  </ThumbnailWrapper>
);

export const AbbreviationLink = () => (
  <ThumbnailWrapper>
    <ThumbnailLinkWithAbbr title="Landing Page" to="#" />
  </ThumbnailWrapper>
);

export const SingleWord = () => (
  <ThumbnailWrapper>
    <ThumbnailWithAbbr title="Portfolio" onClick={() => {}} />
  </ThumbnailWrapper>
);
