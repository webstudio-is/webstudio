import {
  componentsMeta,
  type Instance,
  type Publish,
  type UserProp,
} from "@webstudio-is/sdk";
import { Control } from "apps/designer/app/designer/features/props-panel/control";
import {
  CollapsibleSection,
  ComponentInfo,
} from "apps/designer/app/designer/shared/inspector";
import type { SelectedInstanceData } from "apps/designer/app/shared/canvas-components";
import {
  Box,
  Button,
  Grid,
  TextField,
} from "apps/designer/app/shared/design-system";
import { PlusIcon, TrashIcon } from "apps/designer/app/shared/icons";
import { handleChangePropType, usePropsLogic } from "./use-props-logic";

type PropertyProps = UserProp & {
  component: Instance["component"];
  onChange: handleChangePropType;
  onDelete: (id: UserProp["id"]) => void;
};

const Property = ({
  id,
  prop,
  value,
  required,
  component,
  onChange,
  onDelete,
}: PropertyProps) => {
  const meta = componentsMeta[component];
  const argType = meta?.argTypes?.[prop as keyof typeof meta.argTypes];
  const type = argType?.control.type;
  const defaultValue = argType?.control.defaultValue;
  const options = argType?.options;
  return (
    <Grid gap="1" css={{ gridTemplateColumns: "auto 1fr auto" }}>
      <TextField
        readOnly={required}
        variant="ghost"
        placeholder="Property"
        name="prop"
        value={prop}
        onChange={(event) => {
          onChange(id, "prop", event.target.value);
        }}
      />
      <Control
        type={type}
        required={required}
        defaultValue={defaultValue}
        options={options}
        value={value}
        onChange={(value: UserProp["value"]) => onChange(id, "value", value)}
      />
      <Button
        ghost
        disabled={required}
        onClick={() => {
          onDelete(id);
        }}
      >
        <TrashIcon />
      </Button>
    </Grid>
  );
};

type PropsPanelProps = {
  publish: Publish;
  selectedInstanceData: SelectedInstanceData;
};

export const PropsPanel = ({
  selectedInstanceData,
  publish,
}: PropsPanelProps) => {
  const { userProps, addEmptyProp, handleChangeProp, handleDeleteProp } =
    usePropsLogic({ selectedInstanceData, publish });

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
          {userProps.map(({ id, prop, value, required }) => (
            <Property
              key={id}
              id={id}
              prop={prop}
              value={value}
              required={required}
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
