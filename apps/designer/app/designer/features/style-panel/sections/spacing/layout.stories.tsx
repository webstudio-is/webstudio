import { action } from "@storybook/addon-actions";
import type { ComponentStory, ComponentMeta } from "@storybook/react";
import React from "react";
import { SpacingLayout } from "./layout";

export default {
  title: "Spacing/Layout",
  component: SpacingLayout,
} as ComponentMeta<typeof SpacingLayout>;

const Template = (
  args: Omit<React.ComponentProps<typeof SpacingLayout>, "renderCell">
) => (
  <SpacingLayout
    renderCell={() => <div style={{ color: "red" }}>·</div>}
    {...args}
  />
);

export const Layout: ComponentStory<typeof Template> = Template.bind({});
Layout.args = {
  onClick: action("onClick"),
  onHover: action("onHover"),
};
