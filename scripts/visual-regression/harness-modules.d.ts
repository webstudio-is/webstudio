declare module "visual:preview" {
  import type { Preview } from "@storybook/react";

  const preview: Preview;
  export default preview;
}

declare module "visual:story-modules" {
  export const modules: Record<string, () => Promise<Record<string, unknown>>>;
}
