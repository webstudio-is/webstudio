import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import { Switch as SwitchPrimitive } from "./switch";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";

export default {
  title: "Components/Switch",
  component: SwitchPrimitive,
} satisfies Meta<typeof SwitchPrimitive>;

export const Switch: StoryObj<typeof SwitchPrimitive> = {
  render: (props) =>
    renderComponentTemplate({
      name: "Switch",
      props: { ...props },
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
