import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import { Input as InputPrimitive } from "./input";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";

export default {
  title: "Components/Input",
  component: InputPrimitive,
  argTypes: {
    placeholder: {
      type: "string",
    },
    type: {
      options: ["text", "file"],
      control: { type: "select" },
    },
  },
} satisfies Meta<typeof InputPrimitive>;

export const Input: StoryObj<typeof InputPrimitive> = {
  render: (props) =>
    renderComponentTemplate({
      name: "Input",
      props: { ...props },
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
