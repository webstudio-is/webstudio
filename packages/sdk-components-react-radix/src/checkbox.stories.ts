import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";
import { Checkbox as CheckboxPrimitive } from "./checkbox";

export default {
  title: "Components/Checkbox",
  component: CheckboxPrimitive,
} satisfies Meta<typeof CheckboxPrimitive>;

export const Checkbox: StoryObj<typeof CheckboxPrimitive> = {
  render: (props) =>
    renderComponentTemplate({
      name: "Checkbox",
      props: { ...props },
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
