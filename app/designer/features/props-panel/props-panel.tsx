import {
  componentsMeta,
  type Instance,
  type Publish,
  type UserProp,
} from "@webstudio-is/sdk";
import { Control } from "~/designer/features/props-panel/control";
import { CollapsibleSection, ComponentInfo } from "~/designer/shared/inspector";
import type { SelectedInstanceData } from "~/shared/canvas-components";
import { Box, Button, Grid, TextField } from "~/shared/design-system";
import { PlusIcon, TrashIcon } from "~/shared/icons";
import { usePropsLogic } from "./use-props-logic";

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
  const meta = componentsMeta[component];
  const argType = meta?.argTypes?.[prop as keyof typeof meta.argTypes];
  const type = argType?.control.type;
  const defaultValue = argType?.control.defaultValue;
  const options = argType?.options;
  // TODO: We need to sync defaultValue with value if value is not set and publish this change
  // const realValue = value || defaultValue;
  return (
    <Grid gap="1" css={{ gridTemplateColumns: "auto auto 1fr auto" }}>
      <TextField
        variant="ghost"
        placeholder="Property"
        name="prop"
        value={prop}
        onChange={(event) => {
          onChange(id, "prop", event.target.value);
        }}
      />
      :
      <Control
        type={type}
        defaultValue={defaultValue}
        options={options}
        value={value}
        onChange={(value) => onChange(id, "value", value)}
      />
      <Button
        ghost
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
