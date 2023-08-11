import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import { Tooltip as TooltipPrimitive } from "./tooltip";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";

export default {
  title: "Components/Tooltip",
  component: TooltipPrimitive,
} satisfies Meta<typeof TooltipPrimitive>;

export const Tooltip: StoryObj<typeof TooltipPrimitive> = {
  render: () =>
    renderComponentTemplate({
      name: "Tooltip",
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
