import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import { Button as ButtonPrimitive } from "./button";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";

export default {
  title: "Components/Button",
  component: ButtonPrimitive,
} satisfies Meta<typeof ButtonPrimitive>;

export const Button: StoryObj<typeof ButtonPrimitive> = {
  render: (props) =>
    renderComponentTemplate({
      name: "Button",
      props: { ...props },
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
