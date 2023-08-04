import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import { Sheet as SheetPrimitive } from "./sheet";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";

export default {
  title: "Components/Sheet",
  component: SheetPrimitive,
} satisfies Meta<typeof SheetPrimitive>;

export const Sheet: StoryObj<typeof SheetPrimitive> = {
  render: () =>
    renderComponentTemplate({
      name: "Sheet",
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
