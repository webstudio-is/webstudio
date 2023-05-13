import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Html as HtmlPrimitive } from "./html";

export default {
  title: "Components/Html",
  component: HtmlPrimitive,
} as ComponentMeta<typeof HtmlPrimitive>;

const Template: ComponentStory<typeof HtmlPrimitive> = (args) => (
  <HtmlPrimitive {...args} />
);

export const Html = Template.bind({});
Html.args = {
  code: "<strong>custom code</strong>",
};
