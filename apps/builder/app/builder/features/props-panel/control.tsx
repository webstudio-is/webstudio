import { computed } from "nanostores";
import warnOnce from "warn-once";
import { useMemo } from "react";
import { useStore } from "@nanostores/react";
import type { Instance, Prop } from "@webstudio-is/project-build";
import { getComponentPropsMeta } from "@webstudio-is/react-sdk";
import type { Asset } from "@webstudio-is/asset-uploader";
import {
  Flex,
  DeprecatedLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
} from "@webstudio-is/design-system";
import { assetsStore } from "~/shared/nano-states";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { ImageManager } from "~/builder/shared/image-manager";
import type { UserPropValue } from "./use-props-logic";
import type { SetProperty } from "../style-panel/shared/use-style-data";

const textControlTypes = ["text", "color", "number", "multiline-text"] as const;

type TextControlProps = {
  type: typeof textControlTypes[number];
  value: string;
  onChange: (value: string) => void;
};

const TextControl = ({ value, type, onChange }: TextControlProps) => (
  <TextField
    type={type}
    placeholder="Value"
    name="value"
    value={value}
    onChange={(event) => {
      onChange(event.target.value);
    }}
  />
);

type CheckboxControlProps = {
  value: string;
  onChange: (value: string) => void;
  options: Array<string>;
  type: "check";
};

const CheckboxControl = ({
  value,
  options,
  onChange,
}: CheckboxControlProps) => (
  <RadioGroup
    css={{ flexDirection: "column" }}
    name="value"
    value={value}
    onValueChange={onChange}
  >
    {options.map((option) => (
      <Flex align="center" gap="1" key={option}>
        <Checkbox value={option} />
        <DeprecatedLabel>{option}</DeprecatedLabel>
      </Flex>
    ))}
  </RadioGroup>
);

type RadioControlProps = {
  value: string;
  onChange: (value: string) => void;
  options: Array<string>;
  type: "radio";
};

const RadioControl = ({
  value,
  options,

  onChange,
}: RadioControlProps) => (
  <RadioGroup
    css={{ flexDirection: "column" }}
    name="value"
    value={value}
    onValueChange={onChange}
  >
    {options.map((value) => (
      <Flex align="center" gap="1" key={value}>
        <Radio value={value} id={value} />
        <DeprecatedLabel htmlFor={value}>{value}</DeprecatedLabel>
      </Flex>
    ))}
  </RadioGroup>
);

const selectControlTypes = ["select"] as const;
type SelectControlProps = {
  value: string;
  onChange: (value: string) => void;

  options: Array<string>;
  type: typeof selectControlTypes[number];
};

const SelectControl = ({
  value,
  options,

  onChange,
}: SelectControlProps) => (
  <Select name="value" value={value} options={options} onChange={onChange} />
);

type BooleanControlProps = {
  defaultValue?: boolean;
  value: boolean;
  onChange: (value: boolean) => void;
};

const BooleanControl = ({
  value,
  defaultValue,
  onChange,
}: BooleanControlProps) => (
  <Switch
    name="value"
    defaultChecked={Boolean(defaultValue)}
    checked={value === true}
    onCheckedChange={onChange}
  />
);

type ImageControlProps = {
  assetId: undefined | Asset["id"];
  onChange: (asset: Asset) => void;
};

const ImageControl = ({ assetId, onChange }: ImageControlProps) => {
  const assetStore = useMemo(() => {
    return computed(assetsStore, (assets) => {
      if (assetId === undefined) {
        return undefined;
      }
      return assets.get(assetId);
    });
  }, [assetId]);
  const asset = useStore(assetStore);
  return (
    <FloatingPanel
      title="Images"
      content={
        <ImageManager
          onChange={(asset) => {
            onChange(asset);
          }}
        />
      }
    >
      <TextField defaultValue={asset?.name ?? " - "} />
    </FloatingPanel>
  );
};

const NotImplemented = () => <div />;

const includes = <T extends string>(arr: readonly T[], v: string): v is T => {
  return arr.includes(v as never);
};

const assertUnreachable = (_arg: never, errorMessage: string) => {
  throw new Error(errorMessage);
};

type ControlProps = {
  component: Instance["component"];
  userProp: Prop;
  onChangePropValue: (value: UserPropValue) => void;
  setCssProperty: SetProperty;
};

// eslint-disable-next-line func-style
export function Control({
  component,
  userProp,
  onChangePropValue,
  setCssProperty,
}: ControlProps) {
  const meta = getComponentPropsMeta(component)?.props;

  const argType = meta?.[userProp.name];

  // argType can be undefined in case of new property created
  const defaultValue = argType?.defaultValue ?? "";
  const rawControl = argType?.control || "text";
  const control =
    typeof rawControl === "string" ? { type: rawControl } : rawControl;

  if (control.type === "file-image") {
    const assetId = userProp.type === "asset" ? userProp.value : undefined;

    return (
      <ImageControl
        assetId={assetId}
        onChange={(asset) => {
          onChangePropValue({ type: "asset", value: asset.id });

          const { meta } = asset;
          if ("width" in meta && "height" in meta) {
            // @todo: change on own type, pass width/hight separately
            const aspectRatio = meta.width / meta.height;

            // @todo: own type, simlify width/height, until that use unit as before
            setCssProperty("aspectRatio")({
              type: "unit",
              value: aspectRatio,
              unit: "number",
            });
          }
        }}
      />
    );
  }

  if (userProp.type === "asset") {
    throw new Error(
      `userProp with id "${userProp.value}" has asset but no control exists to process it`
    );
  }

  if (includes(textControlTypes, control.type)) {
    const value = `${userProp.value}`;

    return (
      <TextControl
        value={value}
        onChange={(value) =>
          onChangePropValue({
            type: "string",
            value,
          })
        }
        type={control.type}
      />
    );
  }

  if (control.type === "boolean") {
    const value = Boolean(userProp.value);

    return (
      <BooleanControl
        value={value}
        onChange={(value) =>
          onChangePropValue({
            type: "boolean",
            value,
          })
        }
        defaultValue={Boolean(defaultValue)}
      />
    );
  }

  if (
    control.type === "radio" ||
    control.type === "check" ||
    control.type === "select" ||
    control.type === "inline-check" ||
    control.type === "inline-radio" ||
    control.type === "multi-select"
  ) {
    const options = control.options;

    const value = `${userProp.value}`;

    warnOnce(
      options == null,
      `options is not an array of strings for prop: ${userProp.name} component: ${component}`
    );

    const DEFAULT_OPTIONS: string[] = [];

    if (control.type === "radio" || control.type === "inline-radio") {
      return (
        <RadioControl
          value={value}
          onChange={(value) =>
            onChangePropValue({
              type: "string",
              value,
            })
          }
          options={options ?? DEFAULT_OPTIONS}
          type="radio"
        />
      );
    }

    if (
      control.type === "check" ||
      control.type === "inline-check" ||
      control.type === "multi-select"
    ) {
      return (
        <CheckboxControl
          value={value}
          onChange={(value) =>
            onChangePropValue({
              type: "string",
              value,
            })
          }
          options={options ?? DEFAULT_OPTIONS}
          type="check"
        />
      );
    }

    if (control.type === "select") {
      return (
        <SelectControl
          value={value}
          onChange={(value) =>
            onChangePropValue({
              type: "string",
              value,
            })
          }
          options={options ?? DEFAULT_OPTIONS}
          type={control.type}
        />
      );
    }
  }

  if (
    control.type === "object" ||
    control.type === "date" ||
    control.type === "range"
  ) {
    warnOnce(
      true,
      `Control type "${control.type}" is not implemented for prop: "${userProp.name}" in component "${component}"`
    );
    return <NotImplemented />;
  }

  assertUnreachable(control.type, `Unknown control type ${control.type}`);

  warnOnce(
    true,
    `Control type "${control.type}" is not implemented for prop: "${userProp.name}" in component "${component}"`
  );
  return <NotImplemented />;
}
