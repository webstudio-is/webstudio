import { type UserProp, type Publish } from "@webstudio-is/sdk";
import { CollapsibleSection, ComponentInfo } from "~/designer/shared/inspector";
import { TextField, Flex, Button, Box } from "~/shared/design-system";
import { PlusIcon, TrashIcon } from "~/shared/icons";
import type { SelectedInstanceData } from "~/shared/canvas-components";
import { usePropsLogic } from "./use-props-logic";

type PropertyProps = {
  id: UserProp["id"];
  prop: UserProp["prop"];
  value: UserProp["value"];
  onChange: (
    id: UserProp["id"],
    field: keyof UserProp,
    value: UserProp["prop"] | UserProp["value"]
  ) => void;
  onDelete: (id: UserProp["id"]) => void;
};

const Property = ({ id, prop, value, onChange, onDelete }: PropertyProps) => {
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
      <TextField
        variant="ghost"
        placeholder="Value"
        name="value"
        value={String(value)}
        onChange={(event) => {
          onChange(id, "value", event.target.value);
        }}
      />
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

type StylePanelProps = {
  publish: Publish;
  selectedInstanceData?: SelectedInstanceData;
};

export const SettingsPanel = ({
  selectedInstanceData,
  publish,
}: StylePanelProps) => {
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
              onChange={handleChangeProp}
              onDelete={handleDeleteProp}
            />
          ))}
        </>
      </CollapsibleSection>
    </>
  );
};
