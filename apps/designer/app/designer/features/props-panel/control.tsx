import { UserProp } from "@webstudio-is/react-sdk";
import React, { ComponentProps } from "react";
import {
  Flex,
  Label,
  Radio,
  RadioGroup,
  Select,
  Slider,
  Switch,
  __DEPRECATED__Text,
  TextField,
} from "@webstudio-is/design-system";
import { Checkbox } from "@webstudio-is/design-system";

type BaseControlProps<T = UserProp["value"]> = {
  value?: T;
  defaultValue?: T;
  onChange: (value: T) => void;
  required?: boolean;
};
type TextControlProps = BaseControlProps & {
  type?: ComponentProps<typeof TextField>["type"];
  defaultValue?: UserProp["value"];
};
const TextControl = ({
  value,
  defaultValue,
  type,
  onChange,
}: TextControlProps) => (
  <TextField
    type={type}
    placeholder="Value"
    name="value"
    value={String(value || defaultValue || "")}
    onChange={(event) => {
      onChange(event.target.value);
    }}
  />
);
type CheckboxControlProps = BaseControlProps & {
  options: Array<string>;
};
const CheckboxControl = ({
  value,
  options,
  defaultValue,
  onChange,
}: CheckboxControlProps) => (
  <RadioGroup
    css={{ flexDirection: "column" }}
    name="value"
    value={String(value || defaultValue || "")}
    onValueChange={onChange}
  >
    {options.map((value) => (
      <Flex align="center" gap="1" key={value}>
        <Checkbox value={value} />
        <Label>{value}</Label>
      </Flex>
    ))}
  </RadioGroup>
);
type RadioControlProps = BaseControlProps & {
  options: Array<string>;
};
const RadioControl = ({
  value,
  options,
  defaultValue,
  onChange,
}: RadioControlProps) => (
  <RadioGroup
    css={{ flexDirection: "column" }}
    name="value"
    value={String(value || defaultValue || "")}
    onValueChange={onChange}
  >
    {options.map((value) => (
      <Flex align="center" gap="1" key={value}>
        <Radio value={value} id={value} />
        <Label htmlFor={value}>{value}</Label>
      </Flex>
    ))}
  </RadioGroup>
);

type SelectControlProps = BaseControlProps & {
  options: Array<string>;
};

const SelectControl = ({
  value,
  options,
  defaultValue,
  onChange,
}: SelectControlProps) => (
  <Select
    name="value"
    value={String(value || defaultValue || "")}
    options={options}
    onChange={onChange}
  />
);

const BooleanControl = ({
  value,
  defaultValue,
  onChange,
}: BaseControlProps) => (
  <Switch
    name="value"
    defaultChecked={Boolean(defaultValue)}
    checked={value === true}
    onCheckedChange={onChange}
  />
);

const RangeControl = ({
  value,
  defaultValue,
  onChange,
  min,
  max,
  step,
}: RangeControlProps) => (
  <Flex direction="column" gap={1}>
    <Slider
      value={value}
      defaultValue={defaultValue}
      onValueChange={(values) => {
        onChange(values[0]);
      }}
      min={min}
      max={max}
      step={step}
    />
    <Flex direction="row" justify="between">
      <__DEPRECATED__Text size={1}>{min}</__DEPRECATED__Text>
      <__DEPRECATED__Text size={1}>{max}</__DEPRECATED__Text>
    </Flex>
  </Flex>
);

const NotImplemented = () => <div />;

type PrimitiveControlProps = BaseControlProps & {
  type: "array" | "boolean" | "date" | "number" | "object" | "text";
};

type ColorControlProps = BaseControlProps & {
  type: "color";
  presetColors?: Array<string>;
};

type FileControlProps = BaseControlProps & {
  type: "file";
  accept: string;
};

type RangeControlProps = BaseControlProps<number> & {
  type: "range";
  min: number;
  max: number;
  step: number;
};

type OptionsControlProps = BaseControlProps & {
  type:
    | "radio"
    | "inline-radio"
    | "check"
    | "inline-check"
    | "select"
    | "multi-select";
  options: Array<string>;
};

export type ControlProps =
  | PrimitiveControlProps
  | OptionsControlProps
  | FileControlProps
  | ColorControlProps
  | RangeControlProps;

// eslint-disable-next-line func-style
export function Control(props: ControlProps) {
  switch (props.type) {
    case "array":
      return <TextControl {...props} />;
    case "boolean":
      return <BooleanControl {...props} />;
    case "color":
      return <TextControl {...props} type="color" />;
    case "date":
      return <TextControl {...props} type="date" />;
    case "file":
      return <TextControl {...props} type="file" />;
    case "number":
      return <TextControl {...props} type="number" />;
    case "range":
      return <RangeControl {...props} />;
    case "object":
      return <TextControl {...props} />;
    case "radio":
      return <RadioControl {...props} />;
    case "inline-radio":
      return <RadioControl {...props} />;
    case "check":
      return <CheckboxControl {...props} />;
    case "inline-check":
      return <CheckboxControl {...props} />;
    case "select":
      return <SelectControl {...props} />;
    case "multi-select":
      return <CheckboxControl {...props} />;
    case "text":
      return <TextControl {...props} />;
    default: {
      const _exhaustiveCheck: never = props;
      return <NotImplemented />;
    }
  }
}
