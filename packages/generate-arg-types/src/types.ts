import { z } from "zod";

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

const Text = z.object({
  control: z.literal("text"),
  dataType: z.string(),
  defaultValue: z.string().nullable(),
  ...common,
});

const MultilineText = z.object({
  control: z.literal("multilineText"),
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

// @todo: rename to Switch
const Boolean = z.object({
  control: z.literal("boolean"),
  dataType: z.literal("boolean"),
  defaultValue: z.boolean().nullable(),
  ...common,
});

// @todo: rename to RadioGroup or Radios
const Radio = z.object({
  control: z.literal("radio"),
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

// @todo: rename to CheckboxGroup or Checkboxes
const Check = z.object({
  control: z.literal("check"),
  options: z.array(z.string()),
  dataType: z.array(z.string()),
  defaultValue: z.array(z.string()).nullable(),
  ...common,
});

const ImageUrl = z.object({
  control: z.literal("imageUrl"),
  dataType: z.literal("string"),
  defaultValue: z.string().nullable(),
  ...common,
});

export const PropMeta = z.discriminatedUnion("control", [
  Number,
  Text,
  MultilineText,
  Color,
  Boolean,
  Radio,
  Select,
  Check,
  ImageUrl,
]);

export type PropMeta = z.infer<typeof PropMeta>;
