import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import { Collapsible as CollapsiblePrimitive } from "./collapsible";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";

export default {
  title: "Components/Collapsible",
  component: CollapsiblePrimitive,
} satisfies Meta<typeof CollapsiblePrimitive>;

export const Collapsible: StoryObj<typeof CollapsiblePrimitive> = {
  render: () =>
    renderComponentTemplate({
      name: "Collapsible",
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
