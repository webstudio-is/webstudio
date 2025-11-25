import type { Meta, StoryObj } from "@storybook/react";
import { AnimationPanelContent } from "./animation-panel-content";
import { theme } from "@webstudio-is/design-system";
import { useState } from "react";
import type { ScrollAnimation, ViewAnimation } from "@webstudio-is/sdk";

const meta: Meta = {
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
};

export default meta;
type Story = StoryObj<typeof meta>;

const ScrollAnimationTemplate = () => {
  const [value, setValue] = useState<ScrollAnimation>({
    name: "scroll-animation",
    timing: {
      rangeStart: ["start", { type: "unit", value: 0, unit: "%" }],
      rangeEnd: ["end", { type: "unit", value: 100, unit: "%" }],
    },
    keyframes: [
      {
        offset: 0,
        styles: {
          opacity: { type: "unit", value: 0, unit: "number" },
        },
      },
    ],
  });

  return (
    <AnimationPanelContent
      type="scroll"
      value={value}
      onChange={(newValue) => {
        if (newValue !== undefined) {
          setValue(newValue);
        }
      }}
    />
  );
};

const ViewAnimationTemplate = () => {
  const [value, setValue] = useState<ViewAnimation>({
    name: "view-animation",
    timing: {
      rangeStart: ["entry", { type: "unit", value: 0, unit: "%" }],
      rangeEnd: ["exit", { type: "unit", value: 100, unit: "%" }],
    },
    keyframes: [
      {
        offset: 0,
        styles: {
          opacity: { type: "unit", value: 0, unit: "number" },
        },
      },
    ],
  });

  return (
    <AnimationPanelContent
      type="view"
      value={value}
      onChange={(newValue) => {
        if (newValue !== undefined) {
          setValue(newValue);
        }
      }}
    />
  );
};

export const ScrollAnimationStory: Story = {
  render: ScrollAnimationTemplate,
};

export const ViewAnimationStory: Story = {
  render: ViewAnimationTemplate,
};
