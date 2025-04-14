import type { Meta, StoryObj } from "@storybook/react";
import { AnimationRanges } from "./animation-ranges";
import type { ViewRangeOptionsSchema } from "@webstudio-is/sdk";
import { Grid } from "@webstudio-is/design-system";

// ----- Type definitions -----

const RANGE_TYPES = [
  "contain",
  "cover",
  "entry",
  "exit",
  "entry-crossing",
  "exit-crossing",
] as const;
type RangeType = (typeof RANGE_TYPES)[number];

type StorybookArgs = {
  rangeStartType: RangeType;
  rangeStartValue: number;
  rangeEndType: RangeType;
  rangeEndValue: number;
};

// ----- Storybook config -----

const meta: Meta<(args: StorybookArgs) => React.ReactNode> = {
  title: "Components/AnimationRanges",
  argTypes: {
    rangeStartType: {
      name: "rangeStart[0]",
      control: { type: "select" },
      options: RANGE_TYPES,
      defaultValue: "entry",
    },
    rangeStartValue: {
      name: "rangeStart[1] (% value)",
      control: { type: "range", min: -100, max: 100, step: 1 },
      defaultValue: 0,
    },
    rangeEndType: {
      name: "rangeEnd[0]",
      control: { type: "select" },
      options: RANGE_TYPES,
      defaultValue: "exit",
    },
    rangeEndValue: {
      name: "rangeEnd[1] (% value)",
      control: { type: "range", min: -100, max: 100, step: 1 },
      defaultValue: 100,
    },
  },
  args: {
    rangeStartType: "entry",
    rangeStartValue: 0,
    rangeEndType: "exit",
    rangeEndValue: 100,
  } satisfies StorybookArgs,
};
export default meta;

// ----- Utility to map SB args to component props -----

const getComponentArgs = (args: StorybookArgs): ViewRangeOptionsSchema => {
  return {
    rangeStart: [
      args.rangeStartType,
      { type: "unit", unit: "%", value: args.rangeStartValue },
    ],
    rangeEnd: [
      args.rangeEndType,
      { type: "unit", unit: "%", value: args.rangeEndValue },
    ],
  };
};

// ----- Story -----

type Story = StoryObj<{
  // flatten for controls, type-safe
  rangeStartType: RangeType;
  rangeStartValue: number;
  rangeEndType: RangeType;
  rangeEndValue: number;
}>;

export const Basic: Story = {
  render: (args) => (
    <Grid
      css={{
        width: 400,
        height: 240,
        gridTemplateColumns: "40px 60px 80px",
        gap: 20,
      }}
    >
      <AnimationRanges {...getComponentArgs(args)} />
      <AnimationRanges {...getComponentArgs(args)} />
      <AnimationRanges {...getComponentArgs(args)} />
    </Grid>
  ),
};
