import { UserProp } from "@webstudio-is/sdk";
import React, { ComponentProps } from "react";
import {
  Flex,
  Label,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
} from "~/shared/design-system";
import { Checkbox } from "~/shared/design-system/components/checkbox";

type BaseControlProps = {
  value?: UserProp["value"];
  defaultValue?: UserProp["value"];
  onChange: (value: UserProp["value"]) => void;
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
    variant="ghost"
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
        <Radio value={value} />
        <Label>{value}</Label>
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
    onChange={(event) => {
      onChange(event.target.value);
    }}
  >
    {options.map((optionValue) => (
      <option value={optionValue} key={optionValue}>
        {optionValue}
      </option>
    ))}
  </Select>
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

const NotImplemented = () => <div />;

type SimpleControlProps = BaseControlProps & {
  type:
    | "boolean"
    | "array"
    | "color"
    | "date"
    | "number"
    | "range"
    | "object"
    | "text";
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

export type ControlProps = SimpleControlProps | OptionsControlProps;

// eslint-disable-next-line func-style
export function Control(props: ControlProps) {
  switch (props.type) {
    case "boolean":
      return <BooleanControl {...props} />;
    case "array":
      return <TextControl {...props} />;
    case "color":
      return <TextControl {...props} type="color" />;
    case "date":
      return <TextControl {...props} type="date" />;
    case "number":
      return <TextControl {...props} type="number" />;
    case "range":
      return <NotImplemented />;
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
