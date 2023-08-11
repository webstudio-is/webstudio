import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import { Popover as PopoverPrimitive } from "./popover";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";

export default {
  title: "Components/Popover",
  component: PopoverPrimitive,
} satisfies Meta<typeof PopoverPrimitive>;

export const Popover: StoryObj<typeof PopoverPrimitive> = {
  render: () =>
    renderComponentTemplate({
      name: "Popover",
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
