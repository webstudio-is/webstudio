import { Box, StorySection } from "@webstudio-is/design-system";
import { SearchPreview as SearchPreviewComponent } from "./search-preview";

export default {
  title: "Pages/Search Preview",
  component: SearchPreviewComponent,
};

const faviconDataUrl = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
    <rect width="16" height="16" rx="3" fill="#4a6a8a"/>
    <text x="8" y="8" text-anchor="middle" dominant-baseline="central"
      font-family="sans-serif" font-size="10" font-weight="bold" fill="#fff">W</text>
  </svg>`
)}`;

export const SearchPreview = () => (
  <StorySection title="Search Preview">
    <Box css={{ width: 600, margin: 20 }}>
      <SearchPreviewComponent
        pageUrl="https://webstudio.is/blog-webstudios-architecture-an-overview"
        titleLink="Blog: Webstudio's Architecture - an overview"
        siteName="Webstudio"
        faviconUrl={faviconDataUrl}
        snippet="This is an introduction for developers who want to contribute to Webstudio Core. However, it may also be an interesting read for ambitious designers who want to better understand the future of Webstudio and Visual Development."
      />
    </Box>
  </StorySection>
);
