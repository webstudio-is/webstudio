import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import { Select as SelectPrimitive } from "./select";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";

export default {
  title: "Components/Select",
  component: SelectPrimitive,
} satisfies Meta<typeof SelectPrimitive>;

export const Select: StoryObj<typeof SelectPrimitive> = {
  render: () =>
    renderComponentTemplate({
      name: "Select",
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
