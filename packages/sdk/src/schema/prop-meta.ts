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
  contentMode: z.boolean().optional(),
};

const tag = z.object({
  ...common,
  control: z.literal("tag"),
  type: z.literal("string"),
  defaultValue: z.undefined().optional(),
  options: z.array(z.string()),
});

const number = z.object({
  ...common,
  control: z.literal("number"),
  type: z.literal("number"),
  defaultValue: z.number().optional(),
});

const range = z.object({
  ...common,
  control: z.literal("range"),
  type: z.literal("number"),
  defaultValue: z.number().optional(),
});

const text = z.object({
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

const resource = z.object({
  ...common,
  control: z.literal("resource"),
  type: z.literal("resource"),
  defaultValue: z.string().optional(),
});

const code = z.object({
  ...common,
  control: z.literal("code"),
  type: z.literal("string"),
  language: z.union([
    z.literal("html"),
    z.literal("json"),
    z.literal("markdown"),
  ]),
  defaultValue: z.string().optional(),
});

const codeText = z.object({
  ...common,
  control: z.literal("codetext"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
});

const jsonCode = z.object({
  ...common,
  control: z.literal("json-code"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
});

const color = z.object({
  ...common,
  control: z.literal("color"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
});

const boolean = z.object({
  ...common,
  control: z.literal("boolean"),
  type: z.literal("boolean"),
  defaultValue: z.boolean().optional(),
});

const radio = z.object({
  ...common,
  control: z.literal("radio"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
  options: z.array(z.string()),
});

const inlineRadio = z.object({
  ...common,
  control: z.literal("inline-radio"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
  options: z.array(z.string()),
});

const select = z.object({
  ...common,
  control: z.literal("select"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
  options: z.array(z.string()),
});

const timeZone = z.object({
  ...common,
  control: z.literal("timeZone"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
  options: z.array(z.string()),
});

const check = z.object({
  ...common,
  control: z.literal("check"),
  type: z.literal("string[]"),
  defaultValue: z.array(z.string()).optional(),
  options: z.array(z.string()),
});

const inlineCheck = z.object({
  ...common,
  control: z.literal("inline-check"),
  type: z.literal("string[]"),
  defaultValue: z.array(z.string()).optional(),
  options: z.array(z.string()),
});

const multiSelect = z.object({
  ...common,
  control: z.literal("multi-select"),
  type: z.literal("string[]"),
  defaultValue: z.array(z.string()).optional(),
  options: z.array(z.string()),
});

const file = z.object({
  ...common,
  control: z.literal("file"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
  /** https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#accept */
  accept: z.string().optional(),
});

const url = z.object({
  ...common,
  control: z.literal("url"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
});

const json = z.object({
  ...common,
  control: z.literal("json"),
  type: z.literal("json"),
  defaultValue: z.unknown().optional(),
});

// we neither generate date nor support it in props panel, listed here for completeness
const date = z.object({
  ...common,
  control: z.literal("date"),

  // @todo not sure what type should be here
  // (we don't support Date yet, added for completeness)
  type: z.literal("string"),
  defaultValue: z.string().optional(),
});

const action = z.object({
  ...common,
  control: z.literal("action"),
  type: z.literal("action"),
  defaultValue: z.undefined().optional(),
});

const textContent = z.object({
  ...common,
  control: z.literal("textContent"),
  type: z.literal("string"),
  defaultValue: z.string().optional(),
});

const animationAction = z.object({
  ...common,
  control: z.literal("animationAction"),
  type: z.literal("animationAction"),
  defaultValue: z.undefined().optional(),
});

export const propMeta = z.union([
  tag,
  number,
  range,
  text,
  resource,
  code,
  codeText,
  jsonCode,
  color,
  boolean,
  radio,
  inlineRadio,
  select,
  timeZone,
  multiSelect,
  check,
  inlineCheck,
  file,
  url,
  json,
  date,
  action,
  textContent,
  animationAction,
]);

export type PropMeta = z.infer<typeof propMeta>;
