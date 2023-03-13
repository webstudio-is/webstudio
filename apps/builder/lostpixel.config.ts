import * as process from "process";
import { CustomProjectConfig } from "lost-pixel";

type StorybookShotsConfig = {
  apiKey: string;
};

export const config: Partial<CustomProjectConfig> & StorybookShotsConfig = {
  storybookShots: {
    storybookUrl: "apps/builder/storybook-static",
  },
  lostPixelProjectId: "cleiive6c0gchi40em3uzx1xv",
  apiKey: process.env.LOST_PIXEL_API_KEY,
};
