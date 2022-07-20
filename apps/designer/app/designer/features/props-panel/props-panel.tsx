import {
  componentsMeta,
  type Instance,
  type Publish,
  type UserProp,
} from "@webstudio-is/react-sdk";
import { Control } from "./control";
import { CollapsibleSection, ComponentInfo } from "~/designer/shared/inspector";
import type { SelectedInstanceData } from "~/shared/canvas-components";
import {
  Box,
  Button,
  Combobox,
  Grid,
  TextField,
  Tooltip,
} from "~/shared/design-system";
import { PlusIcon, TrashIcon, ExclamationTriangleIcon } from "~/shared/icons";
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
  const argType = meta.argTypes?.[prop as keyof typeof meta.argTypes];
  const isInvalidProp =
    prop.length > 0 &&
    typeof argType === "undefined" &&
    !prop.match(/^data-(.)+/);
  const type = argType?.control.type || "text";
  const defaultValue = argType?.control.defaultValue;
  const options = argType?.options;
  const allProps = Object.keys(meta.argTypes).map((prop) => ({
    value: prop,
    label: prop,
  }));
  return (
    <Grid
      gap="1"
      css={{ gridTemplateColumns: "1fr 1fr auto", alignItems: "center" }}
    >
      <Combobox
        name="prop"
        options={allProps}
        value={{
          value: prop,
          label: prop,
        }}
        onOptionSelect={({ value }) => {
          console.log(value);
          onChange(id, "prop", value);
        }}
        disclosure={(props) => (
          <TextField
            {...props}
            readOnly={required}
            variant="ghost"
            placeholder="Property"
          />
        )}
      />

      {isInvalidProp ? (
        <Tooltip content={`Invalid property name: ${prop}`}>
          <ExclamationTriangleIcon width={12} height={12} />
        </Tooltip>
      ) : (
        <Control
          type={type}
          required={required}
          defaultValue={defaultValue}
          options={options}
          value={value}
          onChange={(value: UserProp["value"]) => onChange(id, "value", value)}
        />
      )}
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
      <Box css={{ p: "$3" }}>
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
