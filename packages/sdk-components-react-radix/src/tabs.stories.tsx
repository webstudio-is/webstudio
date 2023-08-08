import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import { Tabs as TabsPrimitive } from "./tabs";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";

export default {
  title: "Components/Tabs",
  component: TabsPrimitive,
} satisfies Meta<typeof TabsPrimitive>;

export const Tabs: StoryObj<typeof TabsPrimitive> = {
  render: () =>
    renderComponentTemplate({
      name: "Tabs",
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
