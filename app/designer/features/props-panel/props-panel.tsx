import { type ComponentProps } from "react";
import {
  type UserProp,
  type Publish,
  componentsMeta,
  type Instance,
} from "@webstudio-is/sdk";
import { CollapsibleSection, ComponentInfo } from "~/designer/shared/inspector";
import {
  TextField,
  Flex,
  Label,
  Button,
  Box,
  Radio,
  RadioGroup,
  Select,
  Switch,
} from "~/shared/design-system";
import { PlusIcon, TrashIcon } from "~/shared/icons";
import type { SelectedInstanceData } from "~/shared/component";
import { usePropsLogic } from "./use-props-logic";

type BaseControlProps = {
  value?: UserProp["value"];
  onValueChange: (value: UserProp["value"]) => void;
};

type TextControlProps = BaseControlProps & {
  type?: ComponentProps<typeof TextField>["type"];
  defaultValue?: UserProp["value"];
};

const TextControl = ({
  value,
  defaultValue,
  type,
  onValueChange,
}: TextControlProps) => (
  <TextField
    type={type}
    variant="ghost"
    placeholder="Value"
    name="value"
    value={String(value || defaultValue || "")}
    onChange={(event) => {
      onValueChange(event.target.value);
    }}
  />
);

type RadioControlProps = BaseControlProps & {
  options: Array<string>;
  defaultValue: UserProp["value"];
};

const RadioControl = ({
  value,
  options,
  defaultValue,
  onValueChange,
}: RadioControlProps) => (
  <RadioGroup
    css={{ flexDirection: "column" }}
    name="value"
    value={String(value || defaultValue || "")}
    onValueChange={onValueChange}
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
  defaultValue: UserProp["value"];
};

const SelectControl = ({
  value,
  options,
  defaultValue,
  onValueChange,
}: SelectControlProps) => (
  <Select
    name="value"
    value={String(value || defaultValue || "")}
    onChange={(event) => {
      onValueChange(event.target.value);
    }}
  >
    {options.map((optionValue) => (
      <option value={optionValue} key={optionValue}>
        {optionValue}
      </option>
    ))}
  </Select>
);

type BooleanControlProps = BaseControlProps & {
  defaultValue: boolean;
};

const BooleanControl = ({
  value,
  defaultValue,
  onValueChange,
}: BooleanControlProps) => (
  <Switch
    name="value"
    defaultChecked={defaultValue}
    checked={value === true}
    onCheckedChange={onValueChange}
  />
);

const renderControl = ({
  component,
  prop,
  ...props
}: BaseControlProps & {
  component: Instance["component"];
  prop: UserProp["prop"];
}) => {
  const meta = componentsMeta[component];

  const argType = meta?.argTypes?.[prop as keyof typeof meta.argTypes];

  switch (argType?.control.type) {
    case "text": {
      return <TextControl {...props} defaultValue={argType.defaultValue} />;
    }
    case "number": {
      return (
        <TextControl
          {...props}
          defaultValue={argType.defaultValue}
          type="number"
        />
      );
    }
    case "radio": {
      return (
        <RadioControl
          {...props}
          defaultValue={argType.defaultValue}
          options={argType.options}
        />
      );
    }
    case "select": {
      return (
        <SelectControl
          {...props}
          defaultValue={argType.defaultValue}
          options={argType.options}
        />
      );
    }
    case "boolean": {
      return <BooleanControl {...props} defaultValue={argType.defaultValue} />;
    }
  }

  return <TextControl {...props} />;
};

type PropertyProps = {
  id: UserProp["id"];
  prop: UserProp["prop"];
  value: UserProp["value"];
  component: Instance["component"];
  onChange: (
    id: UserProp["id"],
    field: keyof UserProp,
    value: UserProp["prop"] | UserProp["value"]
  ) => void;
  onDelete: (id: UserProp["id"]) => void;
};

const Property = ({
  id,
  prop,
  value,
  component,
  onChange,
  onDelete,
}: PropertyProps) => {
  return (
    <Flex gap="1">
      <TextField
        variant="ghost"
        placeholder="Property"
        name="prop"
        value={prop}
        onChange={(event) => {
          onChange(id, "prop", event.target.value);
        }}
      />
      {renderControl({
        prop,
        component,
        value,
        onValueChange(value: UserProp["prop"] | UserProp["value"]) {
          onChange(id, "value", value);
        },
      })}
      <Button
        ghost
        onClick={() => {
          onDelete(id);
        }}
      >
        <TrashIcon />
      </Button>
    </Flex>
  );
};

type PropsPanelProps = {
  publish: Publish;
  selectedInstanceData?: SelectedInstanceData;
};

export const PropsPanel = ({
  selectedInstanceData,
  publish,
}: PropsPanelProps) => {
  const { userProps, addEmptyProp, handleChangeProp, handleDeleteProp } =
    usePropsLogic({ selectedInstanceData, publish });

  if (selectedInstanceData === undefined) return null;

  const addButton = (
    <Button
      ghost
      onClick={(event) => {
        event.preventDefault();
        addEmptyProp();
      }}
    >
      <PlusIcon />
    </Button>
  );
  return (
    <>
      <Box css={{ p: "$2" }}>
        <ComponentInfo selectedInstanceData={selectedInstanceData} />
      </Box>
      <CollapsibleSection
        label="Properties"
        rightSlot={addButton}
        isOpenDefault
      >
        <>
          {userProps.map(({ id, prop, value }) => (
            <Property
              key={id}
              id={id}
              prop={prop}
              value={value}
              component={selectedInstanceData.component}
              onChange={handleChangeProp}
              onDelete={handleDeleteProp}
            />
          ))}
        </>
      </CollapsibleSection>
    </>
  );
};
