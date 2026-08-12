declare module "virtual:webstudio-visual-preview" {
  import type { Preview } from "@storybook/react";

  const preview: Preview;
  export default preview;
}

declare module "virtual:webstudio-visual-story-modules" {
  export const modules: Record<string, () => Promise<Record<string, unknown>>>;
}
