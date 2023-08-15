import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import { Textarea as TextareaPrimitive } from "./textarea";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";

export default {
  title: "Components/Textarea",
  component: TextareaPrimitive,
  argTypes: {
    placeholder: {
      type: "string",
    },
  },
} satisfies Meta<typeof TextareaPrimitive>;

export const Textarea: StoryObj<typeof TextareaPrimitive> = {
  render: (props) =>
    renderComponentTemplate({
      name: "Textarea",
      props: { ...props },
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
