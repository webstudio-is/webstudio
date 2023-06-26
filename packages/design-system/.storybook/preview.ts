import type { Preview } from "@storybook/react";
import "@webstudio-is/storybook-config/setup-fonts";
import { decorators } from "@webstudio-is/storybook-config/decorators";
import { color } from "../src/__generated__/figma-design-tokens";

const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  backgrounds: {
    default: "White",
    values: [
      { name: "White", value: "#ffffff" },
      { name: "Black", value: "#000000" },
      { name: "Panel", value: color.backgroundPanel },
      { name: "Maintenance Dark", value: color.maintenanceDark },
      { name: "Maintenance Medium", value: color.maintenanceMedium },
      { name: "Maintenance Light", value: color.maintenanceLight },
    ],
  },
};

export default {
  decorators,
  parameters,
} satisfies Preview;
