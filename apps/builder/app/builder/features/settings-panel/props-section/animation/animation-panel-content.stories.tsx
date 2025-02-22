import type { Meta, StoryObj } from "@storybook/react";
import { AnimationPanelContent } from "./animation-panel-content";
import { theme } from "@webstudio-is/design-system";
import { useState } from "react";
import type { ScrollAnimation, ViewAnimation } from "@webstudio-is/sdk";

const meta = {
  title: "Builder/Settings Panel/Animation Panel Content",
  component: AnimationPanelContent,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ background: theme.colors.backgroundPanel, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AnimationPanelContent>;

export default meta;
type Story = StoryObj<typeof meta>;

const ScrollAnimationTemplate: Story["render"] = ({ value: initialValue }) => {
  const [value, setValue] = useState(initialValue);

  return (
    <AnimationPanelContent
      type="scroll"
      value={value}
      onChange={(newValue) => {
        setValue(newValue as ScrollAnimation);
      }}
    />
  );
};

const ViewAnimationTemplate: Story["render"] = ({ value: initialValue }) => {
  const [value, setValue] = useState(initialValue);

  return (
    <AnimationPanelContent
      type="view"
      value={value}
      onChange={(newValue) => {
        setValue(newValue as ViewAnimation);
      }}
    />
  );
};

export const ScrollAnimationStory: Story = {
  render: ScrollAnimationTemplate,
  args: {
    type: "scroll",
    value: {
      name: "scroll-animation",
      timing: {
        rangeStart: ["start", { type: "unit", value: 0, unit: "%" }],
        rangeEnd: ["end", { type: "unit", value: 100, unit: "%" }],
      },
      keyframes: [
        {
          offset: 0,
          styles: {
            opacity: { type: "unit", value: 0, unit: "%" },
            color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          },
        },
      ],
    },
    onChange: () => {},
  },
};

export const ViewAnimationStory: Story = {
  render: ViewAnimationTemplate,
  args: {
    type: "view",
    value: {
      name: "view-animation",
      timing: {
        rangeStart: ["entry", { type: "unit", value: 0, unit: "%" }],
        rangeEnd: ["exit", { type: "unit", value: 100, unit: "%" }],
      },
      keyframes: [
        {
          offset: 0,
          styles: {
            opacity: { type: "unit", value: 0, unit: "%" },
            color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
          },
        },
      ],
    },
    onChange: () => {},
  },
};
