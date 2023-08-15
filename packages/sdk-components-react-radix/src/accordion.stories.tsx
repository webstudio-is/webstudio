import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import { Accordion as AccordionPrimitive } from "./accordion";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";

export default {
  title: "Components/Accordion",
  component: AccordionPrimitive,
} satisfies Meta<typeof AccordionPrimitive>;

export const Accordion: StoryObj<typeof AccordionPrimitive> = {
  render: () =>
    renderComponentTemplate({
      name: "Accordion",
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
