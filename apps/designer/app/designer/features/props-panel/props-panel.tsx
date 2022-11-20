import {
  componentsMeta,
  type Instance,
  type UserProp,
} from "@webstudio-is/react-sdk";
import { type Publish } from "~/shared/pubsub";
import { Control } from "./control";
import { CollapsibleSection, ComponentInfo } from "~/designer/shared/inspector";
import type { SelectedInstanceData } from "@webstudio-is/project";
import {
  Box,
  Button,
  Grid,
  TextField,
  Tooltip,
  useCombobox,
  ComboboxPopper,
  ComboboxPopperContent,
  ComboboxPopperAnchor,
  ComboboxListbox,
  ComboboxListboxItem,
  IconButton,
} from "@webstudio-is/design-system";
import {
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
} from "@webstudio-is/icons";
import { handleChangePropType, usePropsLogic } from "./use-props-logic";

type ComboboxProps = {
  isReadonly: boolean;
  isInvalid: boolean;
  items: Array<string>;
  value: string;
  onItemSelect: (value: string | null) => void;
  onSubmit: (value: string) => void;
};

const Combobox = ({
  isReadonly,
  isInvalid,
  items: itemsProp,
  value,
  onItemSelect,
  onSubmit,
}: ComboboxProps) => {
  const {
    items,
    getInputProps,
    getComboboxProps,
    getToggleButtonProps,
    getMenuProps,
    getItemProps,
    isOpen,
  } = useCombobox({
    items: itemsProp,
    value,
    itemToString: (item) => item ?? "",
    onItemSelect,
  });

  return (
    <ComboboxPopper>
      <Box {...getComboboxProps()}>
        <ComboboxPopperAnchor>
          <TextField
            {...getInputProps({
              onKeyPress: (event) => {
                if (event.key === "Enter") {
                  onSubmit(event.currentTarget.value);
                }
              },
            })}
            name="prop"
            placeholder="Property"
            readOnly={isReadonly}
            state={isInvalid ? "invalid" : undefined}
            suffix={
              <IconButton {...getToggleButtonProps()}>
                <ChevronDownIcon />
              </IconButton>
            }
          />
        </ComboboxPopperAnchor>
        <ComboboxPopperContent align="start" sideOffset={5}>
          <ComboboxListbox {...getMenuProps()}>
            {isOpen &&
              items.map((item, index) => {
                return (
                  <ComboboxListboxItem
                    {...getItemProps({ item, index })}
                    key={index}
                  >
                    {item}
                  </ComboboxListboxItem>
                );
              })}
          </ComboboxListbox>
        </ComboboxPopperContent>
      </Box>
    </ComboboxPopper>
  );
};

type PropertyProps = UserProp & {
  component: Instance["component"];
  onChange: handleChangePropType;
  onDelete: (id: UserProp["id"]) => void;
};

const Property = ({
  id,
  prop,
  value,
  required = false,
  component,
  onChange,
  onDelete,
}: PropertyProps) => {
  const meta = componentsMeta[component];
  const argType = meta[prop as keyof typeof meta];
  const isInvalid =
    prop != null &&
    prop.length > 0 &&
    typeof argType === "undefined" &&
    !prop.match(/^data-(.)+/);
  const type = argType?.type || "text";
  const defaultValue = argType?.defaultValue;
  const options = argType?.options;
  const allProps = Object.keys(meta);

  return (
    <Grid
      gap={1}
      css={{ gridTemplateColumns: "1fr 1fr auto", alignItems: "center" }}
    >
      <Combobox
        items={allProps}
        value={prop}
        onItemSelect={(value: PropertyProps["value"] | null) => {
          if (value !== null) {
            onChange(id, "prop", value);
          }
        }}
        onSubmit={(value) => {
          onChange(id, "prop", value);
        }}
        isInvalid={isInvalid}
        isReadonly={required}
      />
      {isInvalid ? (
        <Tooltip content={`Invalid property name: ${prop}`}>
          <ExclamationTriangleIcon width={12} height={12} />
        </Tooltip>
      ) : (
        // requires matching complex union
        // skip for now and fix types later
        <Control
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type={type as any}
          defaultValue={defaultValue ?? undefined}
          options={options ?? []}
          value={value}
          onChange={(value: UserProp["value"]) => onChange(id, "value", value)}
        />
      )}
      {required !== true && (
        <Button
          ghost
          onClick={() => {
            onDelete(id);
          }}
        >
          <TrashIcon />
        </Button>
      )}
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
      <Box css={{ p: "$spacing$9" }}>
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
