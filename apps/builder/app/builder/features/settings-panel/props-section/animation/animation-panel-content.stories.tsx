import { AnimationPanelContent } from "./animation-panel-content";
import { StorySection, theme } from "@webstudio-is/design-system";
import { useState } from "react";
import type { ScrollAnimation, ViewAnimation } from "@webstudio-is/sdk";

export default {
  title: "Settings panel/Animation panel content",
  component: AnimationPanelContent,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div
        style={{
          background: theme.colors.backgroundPanel,
          padding: 16,
          width: theme.sizes.sidebarWidth,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

const scrollInitialValue: ScrollAnimation = {
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
};

const viewInitialValue: ViewAnimation = {
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
};

const ScrollAnimationDemo = () => {
  const [value, setValue] = useState<ScrollAnimation>(scrollInitialValue);
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

const ViewAnimationDemo = () => {
  const [value, setValue] = useState<ViewAnimation>(viewInitialValue);
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

export const AnimationPanelContentStory = () => (
  <>
    <StorySection title="Scroll animation">
      <ScrollAnimationDemo />
    </StorySection>
    <StorySection title="View animation">
      <ViewAnimationDemo />
    </StorySection>
  </>
);
