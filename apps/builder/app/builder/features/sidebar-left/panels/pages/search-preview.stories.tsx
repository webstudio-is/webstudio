import { Box } from "@webstudio-is/design-system";
import { SearchPreview } from "./search-preview";

export default { component: SearchPreview };

export const Basic = () => (
  <Box css={{ width: 600, margin: 20 }}>
    <SearchPreview
      pageUrl="https://webstudio.is/blog-webstudios-architecture-an-overview"
      title="Blog: Webstudio's Architecture - an overview"
      siteName="Webstudio"
      faviconUrl="https://webstudio.is/favicon.ico"
      description="This is an introduction for developers who want to contribute to Webstudio Core. However, it may also be an interesting read for ambitious designers who want to better understand the future of Webstudio and Visual Development."
    />
  </Box>
);
