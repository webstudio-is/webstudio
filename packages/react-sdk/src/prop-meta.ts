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

const Code = z.object({
  ...common,
  control: z.literal("code"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
});

const CodeText = Code.extend({
  control: z.literal("codetext"),
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

const File = z.object({
  ...common,
  control: z.literal("file"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
  /** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#accept */
  accept: z.string().optional(),
});

const Url = z.object({
  ...common,
  control: z.literal("url"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
});

const Json = z.object({
  ...common,
  control: z.literal("json"),
  type: z.literal("json"),
  defaultValue: z.unknown().optional(),
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

const Action = z.object({
  ...common,
  control: z.literal("action"),
  type: z.literal("action"),
  defaultValue: z.undefined().optional(),
});

const TextContent = z.object({
  ...common,
  control: z.literal("textContent"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
});

export const PropMeta = z.union([
  Number,
  Range,
  Text,
  Code,
  CodeText,
  Color,
  Boolean,
  Radio,
  InlineRadio,
  Select,
  MultiSelect,
  Check,
  InlineCheck,
  File,
  Url,
  Json,
  Date,
  Action,
  TextContent,
]);

export type PropMeta = z.infer<typeof PropMeta>;
