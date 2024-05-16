import type { Meta, StoryObj } from "@storybook/react";

import { Time } from "./time";

const meta: Meta<typeof Time> = {
  title: "Components/Time",
  component: Time,
};

export default meta;

type Story = StoryObj<typeof Time>;

export const Default: Story = {
  args: {
    language: "en",
    country: "US",
    dateStyle: "full",
    timeStyle: "full",
    datetime: "2024-05-16T12:00:00Z",
  },
};

export const OptionsNotDefined: Story = {
  args: {
    datetime: "2024-05-16T12:00:00Z",
  },
};

export const NotDefined: Story = {
  args: {},
};

export const InvalidDateTime: Story = {
  args: {
    datetime: "Any Text Instead Of Date Time",
  },
};

export const InvalidOptionTypes: Story = {
  args: {
    language: {} as "en",
    country: {} as "US",
    dateStyle: {} as "full",
    timeStyle: {} as "full",

    datetime: "2024-05-16T12:00:00Z",
  },
};

export const InvalidDateTimeType: Story = {
  args: {
    datetime: {} as "2024-05-16T12:00:00Z",
  },
};
