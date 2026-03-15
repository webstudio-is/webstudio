import { Box } from "@webstudio-is/design-system";
import { SocialPreview } from "./social-preview";

const placeholderImage = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#c0d0e0"/>
    <text x="600" y="315" text-anchor="middle" dominant-baseline="central"
      font-family="sans-serif" font-size="48" fill="#4a6a8a">1200 × 630</text>
  </svg>`
)}`;

export default {
  title: "Pages/Social Preview",
  component: SocialPreview,
};

export const WithImage = () => (
  <Box css={{ width: 600, margin: 20 }}>
    <SocialPreview
      ogImageUrl={placeholderImage}
      ogUrl="https://webstudio.is/blog/architecture-overview"
      ogTitle="Webstudio's Architecture - An Overview"
      ogDescription="This is an introduction for developers who want to contribute to Webstudio Core. However, it may also be an interesting read for ambitious designers."
    />
  </Box>
);

export const WithoutImage = () => (
  <Box css={{ width: 600, margin: 20 }}>
    <SocialPreview
      ogUrl="https://webstudio.is/about"
      ogTitle="About Webstudio"
      ogDescription="A visual development platform for building professional websites without code."
    />
  </Box>
);

export const LongContent = () => (
  <Box css={{ width: 600, margin: 20 }}>
    <SocialPreview
      ogUrl="https://webstudio.is/blog/very-long-url-path/that-should-be-truncated/at-some-point-because-its-too-long"
      ogTitle="This Is a Very Long Title That Should Be Truncated After a Certain Number of Characters to Prevent Layout Issues"
      ogDescription="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
    />
  </Box>
);
