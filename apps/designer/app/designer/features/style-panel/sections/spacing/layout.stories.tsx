import { action } from "@storybook/addon-actions";
import type { ComponentStory, ComponentMeta } from "@storybook/react";
import React from "react";
import { SpacingLayout as SpacingLayoutComponet } from "./layout";

export default {
  title: "SpacingLayout",
  component: SpacingLayoutComponet,
} as ComponentMeta<typeof SpacingLayoutComponet>;

const Template = (
  args: Omit<React.ComponentProps<typeof SpacingLayoutComponet>, "renderCell">
) => (
  <SpacingLayoutComponet
    renderCell={() => <div style={{ color: "red" }}>·</div>}
    {...args}
  />
);

export const SpacingLayout: ComponentStory<typeof Template> = Template.bind({});
SpacingLayout.args = {
  onClick: action("onClick"),
  onHover: action("onHover"),
};
