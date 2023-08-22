import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import { NavigationMenu as NavigationMenuPrimitive } from "./navigation-menu";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";

export default {
  title: "Components/NavigationMenu",
  component: NavigationMenuPrimitive,
} satisfies Meta<typeof NavigationMenuPrimitive>;

export const NavigationMenu: StoryObj<typeof NavigationMenuPrimitive> = {
  render: () =>
    renderComponentTemplate({
      name: "NavigationMenu",
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
