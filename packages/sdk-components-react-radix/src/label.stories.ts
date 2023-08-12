import type { Meta, StoryObj } from "@storybook/react";
import { renderComponentTemplate } from "@webstudio-is/react-sdk";
import { Label as LabelPrimitive } from "./label";
import * as baseComponents from "@webstudio-is/sdk-components-react";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as radixComponents from "./components";
import * as radixMetas from "./metas";

export default {
  title: "Components/Label",
  component: LabelPrimitive,
} satisfies Meta<typeof LabelPrimitive>;

export const Label: StoryObj<typeof LabelPrimitive> = {
  render: (props) =>
    renderComponentTemplate({
      name: "Label",
      props: { ...props },
      components: { ...baseComponents, ...radixComponents },
      metas: { ...baseMetas, ...radixMetas },
    }),
};
