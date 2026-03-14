import { Box } from "@webstudio-is/design-system";
import { SocialPreview } from "./social-preview";

export default {
  title: "Pages/Social Preview",
  component: SocialPreview,
};

export const WithImage = () => (
  <Box css={{ width: 600, margin: 20 }}>
    <SocialPreview
      ogImageUrl="https://picsum.photos/1200/630"
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
