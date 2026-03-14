import { AnimationPanelContent } from "./animation-panel-content";
import { Box, theme } from "@webstudio-is/design-system";
import { useState } from "react";
import type { ScrollAnimation, ViewAnimation } from "@webstudio-is/sdk";

export default {
  title: "Settings Panel/Animation Panel Content",
};

const Panel = ({ children }: { children: React.ReactNode }) => (
  <Box
    css={{
      background: theme.colors.backgroundPanel,
      padding: theme.spacing[5],
    }}
  >
    {children}
  </Box>
);

export const ScrollAnimationStory = () => {
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
          opacity: { type: "unit", value: 0, unit: "%" },
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
        },
      },
    ],
  });

  return (
    <Panel>
      <AnimationPanelContent
        type="scroll"
        value={value}
        onChange={(newValue) => {
          setValue(newValue as ScrollAnimation);
        }}
      />
    </Panel>
  );
};

export const ViewAnimationStory = () => {
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
          opacity: { type: "unit", value: 0, unit: "%" },
          color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
        },
      },
    ],
  });

  return (
    <Panel>
      <AnimationPanelContent
        type="view"
        value={value}
        onChange={(newValue) => {
          setValue(newValue as ViewAnimation);
        }}
      />
    </Panel>
  );
};
