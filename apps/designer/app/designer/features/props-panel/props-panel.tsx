import { useState } from "react";
import {
  getComponentMetaProps,
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
  DeprecatedIconButton,
} from "@webstudio-is/design-system";
import {
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
} from "@webstudio-is/icons";
import { usePropsLogic, type UserPropValue } from "./use-props-logic";
import {
  useStyleData,
  type SetProperty,
} from "../style-panel/shared/use-style-data";

type ComboboxProps = {
  isReadonly: boolean;
  isInvalid: boolean;
  items: Array<string>;
  value: string;
  onItemSelect: (value: string | null) => void;
  onSubmit: (value: string) => void;
  onInput: (value: string) => void;
};

const Combobox = ({
  isReadonly,
  isInvalid,
  items: itemsProp,
  value,
  onItemSelect,
  onSubmit,
  onInput,
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
    selectedItem: value,
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
              onInput: (event) => {
                onInput(event.currentTarget.value);
              },
            })}
            name="prop"
            placeholder="Property"
            readOnly={isReadonly}
            state={isInvalid ? "invalid" : undefined}
            suffix={
              <DeprecatedIconButton {...getToggleButtonProps()}>
                <ChevronDownIcon />
              </DeprecatedIconButton>
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

type PropertyProps = {
  userProp: UserProp;
  component: Instance["component"];
  onChangePropName: (name: string) => void;
  onChangePropValue: (value: UserPropValue) => void;
  onDelete: (id: UserProp["id"]) => void;
  setCssProperty: SetProperty;
  required: boolean;
  existingProps: string[];
};

const Property = ({
  userProp,
  component,
  onChangePropName,
  onChangePropValue,
  onDelete,
  setCssProperty,
  required,
  existingProps,
}: PropertyProps) => {
  const metaProps = getComponentMetaProps(component);

  const argType = metaProps[userProp.prop as keyof typeof metaProps];
  const isInvalid =
    userProp.prop != null &&
    userProp.prop.length > 0 &&
    typeof argType === "undefined" &&
    !userProp.prop.match(/^data-(.)+/);

  const allProps = Object.keys(metaProps).filter(
    (propName) => existingProps.includes(propName) === false
  );

  const [error, setError] = useState<string | undefined>(undefined);

  return (
    <>
      {required ? (
        <TextField
          name="prop"
          placeholder="Property"
          readOnly={true}
          state={isInvalid ? "invalid" : undefined}
          value={userProp.prop}
        />
      ) : (
        <Combobox
          items={allProps}
          value={userProp.prop}
          onItemSelect={(name) => {
            if (name != null) {
              setError(undefined);
              onChangePropName(name);
            }
          }}
          onSubmit={(name) => {
            if (existingProps.includes(name) === false) {
              setError(undefined);
              onChangePropName(name);
              return;
            }
            setError(`Property "${name}" is already exists`);
          }}
          onInput={() => {
            setError(undefined);
          }}
          isInvalid={isInvalid || error !== undefined}
          isReadonly={required}
        />
      )}
      {isInvalid || error !== undefined ? (
        <Tooltip content={error ?? `Invalid property name: ${userProp.prop}`}>
          <ExclamationTriangleIcon width={12} height={12} />
        </Tooltip>
      ) : (
        // requires matching complex union
        // skip for now and fix types later
        <Control
          component={component}
          userProp={userProp}
          onChangePropValue={onChangePropValue}
          setCssProperty={setCssProperty}
        />
      )}
      {required ? (
        <Box />
      ) : (
        <Button
          variant="ghost"
          onClick={() => {
            onDelete(userProp.id);
          }}
          prefix={<TrashIcon />}
        />
      )}
    </>
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
  const {
    userProps,
    addEmptyProp,
    handleChangePropName,
    handleChangePropValue,
    handleDeleteProp,
    isRequired,
  } = usePropsLogic({ selectedInstanceData, publish });

  const { setProperty: setCssProperty } = useStyleData({
    selectedInstanceData,
    publish,
  });

  const addButton = (
    <Button
      variant="ghost"
      onClick={(event) => {
        event.preventDefault();
        addEmptyProp();
      }}
      prefix={<PlusIcon />}
    />
  );

  const existingProps = userProps.map((userProp) => userProp.prop);

  return (
    <Box>
      <Box css={{ p: "$spacing$9" }}>
        <ComponentInfo selectedInstanceData={selectedInstanceData} />
      </Box>
      <CollapsibleSection
        label="Properties"
        rightSlot={addButton}
        isOpenDefault
      >
        <Grid
          gap={1}
          css={{
            gridTemplateColumns: "1fr minmax(0, 1fr) auto",
            alignItems: "center",
          }}
        >
          {userProps.map((userProp) => (
            <Property
              key={userProp.id}
              userProp={userProp}
              component={selectedInstanceData.component}
              onChangePropName={(name) =>
                handleChangePropName(userProp.id, name)
              }
              onChangePropValue={(value) =>
                handleChangePropValue(userProp.id, value)
              }
              setCssProperty={setCssProperty}
              onDelete={handleDeleteProp}
              required={isRequired(userProp)}
              existingProps={existingProps}
            />
          ))}
        </Grid>
      </CollapsibleSection>
    </Box>
  );
};
