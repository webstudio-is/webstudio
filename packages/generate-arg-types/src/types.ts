import { z } from "zod";

// Note on Storybook compatibility!
//
// In the future we may need converter functions between Storybook's ArgTypes and PropMeta.
// We should keep this in mind when designing the PropMeta type.
// https://storybook.js.org/docs/react/api/argtypes
// https://github.com/ComponentDriven/csf/blob/next/src/story.ts#L63
//
// We want to have the same list of controls as Storybook (with some additions)
// https://storybook.js.org/docs/react/essentials/controls

const common = {
  label: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean(),
};

const Number = z.object({
  ...common,
  control: z.literal("number"),
  type: z.literal("number"),
  defaultValue: z.number().optional(),
});

const Range = z.object({
  ...common,
  control: z.literal("range"),
  type: z.literal("number"),
  defaultValue: z.number().optional(),
});

const Text = z.object({
  ...common,
  control: z.literal("text"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
  /**
   * The number of rows in <textarea>. If set to 0 an <input> will be used instead.
   * In line with Storybook team's plan: https://github.com/storybookjs/storybook/issues/21100
   */
  rows: z.number().optional(),
});

const Color = z.object({
  ...common,
  control: z.literal("color"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
});

const Boolean = z.object({
  ...common,
  control: z.literal("boolean"),
  type: z.literal("boolean"),
  defaultValue: z.boolean().optional(),
});

const Radio = z.object({
  ...common,
  control: z.literal("radio"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
  options: z.array(z.string()),
});

const InlineRadio = z.object({
  ...common,
  control: z.literal("inline-radio"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
  options: z.array(z.string()),
});

const Select = z.object({
  ...common,
  control: z.literal("select"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
  options: z.array(z.string()),
});

const Check = z.object({
  ...common,
  control: z.literal("check"),
  type: z.literal("string[]"),
  defaultValue: z.array(z.string()).optional(),
  options: z.array(z.string()),
});

const InlineCheck = z.object({
  ...common,
  control: z.literal("inline-check"),
  type: z.literal("string[]"),
  defaultValue: z.array(z.string()).optional(),
  options: z.array(z.string()),
});

const MultiSelect = z.object({
  ...common,
  control: z.literal("multi-select"),
  type: z.literal("string[]"),
  defaultValue: z.array(z.string()).optional(),
  options: z.array(z.string()),
});

// @todo
// remove this and add a generic "file" control instead with an "accept" option
// to be in line with Storybook
const FileImage = z.object({
  ...common,
  control: z.literal("file-image"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
});

// we neither generate object nor support it in props panel, listed here for completeness
// can't use name "Object" for the variable because it causes bugs when Object.assign() is used in compiled output
const ObjectType = z.object({
  ...common,
  control: z.literal("object"),

  // @todo not sure what type should be here
  // (we don't support Object yet, added for completeness)
  type: z.literal("Record<string, string>"),
  defaultValue: z.record(z.string()).optional(),
});

// we neither generate date nor support it in props panel, listed here for completeness
const Date = z.object({
  ...common,
  control: z.literal("date"),

  // @todo not sure what type should be here
  // (we don't support Date yet, added for completeness)
  type: z.literal("string"),
  defaultValue: z.string().optional(),
});

export const PropMeta = z.union([
  Number,
  Range,
  Text,
  Color,
  Boolean,
  Radio,
  InlineRadio,
  Select,
  MultiSelect,
  Check,
  InlineCheck,
  FileImage,
  ObjectType,
  Date,
]);

export type PropMeta = z.infer<typeof PropMeta>;
