import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";
import { RadioGroup as RadioGroupPrimitive } from "./radio-group";

export default {
  title: "Components/RadioGroup",
  component: RadioGroupPrimitive,
} satisfies Meta<typeof RadioGroupPrimitive>;

export const RadioGroup: StoryObj<typeof RadioGroupPrimitive> = {
  render: (props) =>
    renderComponentTemplate({
      name: "RadioGroup",
      props: { ...props },
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
