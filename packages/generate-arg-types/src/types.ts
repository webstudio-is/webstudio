import { z } from "zod";

// The names of "control" here are trying to match the names of the controls in Storybook
// https://storybook.js.org/docs/react/essentials/controls

const common = {
  required: z.boolean(),
  label: z.string().optional(),
};

const Number = z.object({
  control: z.literal("number"),
  dataType: z.literal("number"),
  defaultValue: z.number().nullable(),
  ...common,
});

const Range = z.object({
  control: z.literal("range"),
  dataType: z.literal("number"),
  defaultValue: z.number().nullable(),
  ...common,
});

const Text = z.object({
  control: z.literal("text"),
  dataType: z.string(),
  defaultValue: z.string().nullable(),
  ...common,
});

const MultilineText = z.object({
  control: z.literal("multiline-text"),
  dataType: z.literal("string"),
  defaultValue: z.string().nullable(),
  ...common,
});

const Color = z.object({
  control: z.literal("color"),
  dataType: z.literal("string"),
  defaultValue: z.string().nullable(),
  ...common,
});

const Boolean = z.object({
  control: z.literal("boolean"),
  dataType: z.literal("boolean"),
  defaultValue: z.boolean().nullable(),
  ...common,
});

const Radio = z.object({
  control: z.literal("radio"),
  options: z.array(z.string()),
  dataType: z.literal("string"),
  defaultValue: z.string().nullable(),
  ...common,
});

const InlineRadio = z.object({
  control: z.literal("inline-radio"),
  options: z.array(z.string()),
  dataType: z.literal("string"),
  defaultValue: z.string().nullable(),
  ...common,
});

const Select = z.object({
  control: z.literal("select"),
  options: z.array(z.string()),
  dataType: z.literal("string"),
  defaultValue: z.string().nullable(),
  ...common,
});

const MultiSelect = z.object({
  control: z.literal("multi-select"),
  options: z.array(z.string()),
  dataType: z.array(z.string()),
  defaultValue: z.array(z.string()).nullable(),
  ...common,
});

const Check = z.object({
  control: z.literal("check"),
  options: z.array(z.string()),
  dataType: z.array(z.string()),
  defaultValue: z.array(z.string()).nullable(),
  ...common,
});

const InlineCheck = z.object({
  control: z.literal("inline-check"),
  options: z.array(z.string()),
  dataType: z.array(z.string()),
  defaultValue: z.array(z.string()).nullable(),
  ...common,
});

// @todo
// remove this and add a generic "file" control instead with an "accept" option
// to be in line with Storybook
const FileImage = z.object({
  control: z.literal("file-image"),
  dataType: z.literal("string"),
  defaultValue: z.string().nullable(),
  ...common,
});

const Object = z.object({
  control: z.literal("object"),
  dataType: z.string(),
  defaultValue: z.string().nullable(),
  ...common,
});

const Date = z.object({
  control: z.literal("date"),
  dataType: z.literal("string"),
  defaultValue: z.string().nullable(),
  ...common,
});

export const PropMeta = z.discriminatedUnion("control", [
  Number,
  Range,
  Text,
  MultilineText,
  Color,
  Boolean,
  Radio,
  InlineRadio,
  Select,
  MultiSelect,
  Check,
  InlineCheck,
  FileImage,
  Object,
  Date,
]);

export type PropMeta = z.infer<typeof PropMeta>;
