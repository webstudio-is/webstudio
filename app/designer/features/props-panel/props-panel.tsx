import {
  type UserProp,
  type Publish,
  components,
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
} from "~/shared/design-system";
import { PlusIcon, TrashIcon } from "~/shared/icons";
import type { SelectedInstanceData } from "~/shared/component";
import { usePropsLogic } from "./use-props-logic";
//console.log(componentsMeta, components);

type ControlProps = {
  defaultValue?: UserProp["value"];
  value: UserProp["value"];
  onChangeValue: any; // (value: string) => void;
};

const TextControl = ({ value, defaultValue, onChangeValue }: ControlProps) => (
  <TextField
    variant="ghost"
    placeholder="Value"
    name="value"
    value={value || defaultValue}
    onChange={(event) => {
      onChangeValue(event.target.value);
    }}
  />
);

const RadioControl = ({
  value,
  options,
  defaultValue,
  onChangeValue,
}: ControlProps & { options: Array<string> }) => (
  <RadioGroup
    css={{ flexDirection: "column" }}
    name="value"
    value={value || defaultValue}
    onChangeValue={onChangeValue}
  >
    {options.map((value) => (
      <Flex align="center" gap="1">
        <Radio value={value} />
        <Label>{value}</Label>
      </Flex>
    ))}
  </RadioGroup>
);

const controls = {
  text: TextControl,
  radio: RadioControl,
};

const renderControl = ({
  component,
  prop,
  ...props
}: ControlProps & {
  component: Instance["component"];
  prop: UserProp["prop"];
}) => {
  const meta = componentsMeta[component];
  const argType = meta?.argTypes[prop];
  console.log(prop, meta, argType);

  switch (argType?.control) {
    case "text": {
      return <TextControl {...props} defaultValue={argType.defaultValue} />;
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
        onChangeValue(value: string) {
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
