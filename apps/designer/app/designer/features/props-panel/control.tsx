import {
  componentsMeta,
  type Instance,
  type UserProp,
} from "@webstudio-is/react-sdk";
import warnOnce from "warn-once";
import {
  Flex,
  Label,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
} from "@webstudio-is/design-system";

import { Checkbox } from "@webstudio-is/design-system";

type BaseControlProps<T = UserProp["value"]> = {
  value?: T;
  defaultValue: T | null;
  onChange: (value: T) => void;
  required?: boolean;
};

const textControlTypes = [
  "text",
  "array",
  "color",
  "date",
  "file",
  "number",
  "object",
] as const;

type TextControlProps = BaseControlProps & {
  type: typeof textControlTypes[number];
  defaultValue: string | null;
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

const checkboxControlTypes = ["check", "inline-check", "multi-select"] as const;

type CheckboxControlProps = BaseControlProps & {
  options: Array<string>;
  type: typeof checkboxControlTypes[number];
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

const radioControlTypes = ["radio", "inline-radio"] as const;

type RadioControlProps = BaseControlProps & {
  options: Array<string>;
  type: typeof radioControlTypes[number];
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

const selectControlTypes = ["select"] as const;
type SelectControlProps = BaseControlProps & {
  options: Array<string>;
  type: typeof selectControlTypes[number];
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

const NotImplemented = () => <div />;

export type ControlProps = {
  component: Instance["component"];
  prop: string;
  value: UserProp["value"];
  onChange: (value: UserProp["value"]) => void;
};

const includes = <T extends string>(arr: readonly T[], v: string): v is T => {
  return arr.includes(v as never);
};

const isStringArray = (arr: unknown): arr is Array<string> => {
  return Array.isArray(arr) && arr.every((v) => typeof v === "string");
};

// eslint-disable-next-line func-style
export function Control({ component, prop, value, onChange }: ControlProps) {
  const meta = componentsMeta[component];
  const argType = meta[prop as keyof typeof meta];

  const defaultValue = argType.defaultValue;
  const type = argType.type;

  if (type == null) {
    warnOnce(
      type == null,
      `No control type for prop: ${prop} component: ${component} found`
    );
    return <NotImplemented />;
  }

  if (typeof type !== "string") {
    warnOnce(
      typeof type !== "string",
      `Control type for prop: ${prop} component: ${component} is not a string but ${typeof type}`
    );

    return <NotImplemented />;
  }

  if (includes(textControlTypes, type)) {
    return (
      <TextControl
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        type={type}
      />
    );
  }

  if (type === "boolean") {
    return (
      <BooleanControl
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
      />
    );
  }

  if (
    includes(
      [...radioControlTypes, ...checkboxControlTypes, ...selectControlTypes],
      type
    )
  ) {
    const options = isStringArray(argType?.options)
      ? argType?.options ?? null
      : null;

    warnOnce(
      options == null,
      `options is not an array of strings for prop: ${prop} component: ${component}`
    );

    const DEFAULT_OPTIONS: string[] = [];

    if (includes(radioControlTypes, type)) {
      return (
        <RadioControl
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          options={options ?? DEFAULT_OPTIONS}
          type={type}
        />
      );
    }

    if (includes(checkboxControlTypes, type)) {
      return (
        <CheckboxControl
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          options={options ?? DEFAULT_OPTIONS}
          type={type}
        />
      );
    }

    if (includes(selectControlTypes, type)) {
      return (
        <SelectControl
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          options={options ?? DEFAULT_OPTIONS}
          type={type}
        />
      );
    }
  }

  warnOnce(
    true,
    `Control type ${type} not implemented for prop: ${prop} component: ${component}`
  );

  return <NotImplemented />;
}
