import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import { Dialog as DialogPrimitive } from "./dialog";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";

export default {
  title: "Components/Dialog",
  component: DialogPrimitive,
} satisfies Meta<typeof DialogPrimitive>;

export const Dialog: StoryObj<typeof DialogPrimitive> = {
  render: () =>
    renderComponentTemplate({
      name: "Dialog",
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
