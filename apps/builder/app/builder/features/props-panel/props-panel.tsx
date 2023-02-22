import store from "immerhin";
import type { Instance, Prop } from "@webstudio-is/project-build";
import {
  theme,
  Box,
  Button,
  useCombobox,
  ComboboxPopper,
  ComboboxPopperContent,
  ComboboxPopperAnchor,
  ComboboxListbox,
  ComboboxListboxItem,
  TextField,
  SmallIconButton,
} from "@webstudio-is/design-system";
import { ChevronDownIcon, PlusIcon } from "@webstudio-is/icons";
import type { Publish } from "~/shared/pubsub";
import { propsStore, useInstanceProps } from "~/shared/nano-states";
import { CollapsibleSection, ComponentInfo } from "~/builder/shared/inspector";
import {
  useStyleData,
  type SetProperty as SetCssProperty,
} from "~/builder/features/style-panel/shared/use-style-data";
import { renderControl } from "./controls/combined";
import { usePropsLogic, type NameAndLabel } from "./use-props-logic";
import { type PropMeta, type PropValue, getLabel } from "./shared";

import { useState } from "react";

const itemToString = (item: NameAndLabel | null) =>
  item ? getLabel(item, item.name) : "";

const Combobox = ({
  items,
  onItemSelect,
}: {
  items: NameAndLabel[];
  onItemSelect: (item: NameAndLabel) => void;
}) => {
  const [inputValue, setInputValue] = useState("");

  const combobox = useCombobox<NameAndLabel>({
    items,
    itemToString,
    onItemSelect,
    selectedItem: undefined,

    // this weird handling of value is needed to work around a limitation in useCombobox
    // where it doesn't allow to leave both `value` and `selectedItem` empty/uncontrolled
    value: { name: "", label: inputValue },
    onInputChange: (value) => setInputValue(value ?? ""),
  });

  return (
    <ComboboxPopper>
      <div {...combobox.getComboboxProps()}>
        <ComboboxPopperAnchor>
          <TextField
            {...combobox.getInputProps()}
            placeholder="Property"
            suffix={
              <SmallIconButton
                {...combobox.getToggleButtonProps()}
                icon={<ChevronDownIcon />}
              />
            }
          />
        </ComboboxPopperAnchor>
        <ComboboxPopperContent align="end" sideOffset={5}>
          <ComboboxListbox {...combobox.getMenuProps()}>
            {combobox.isOpen &&
              combobox.items.map((item, index) => (
                <ComboboxListboxItem
                  key={item.name}
                  selectable={false}
                  {...combobox.getItemProps({ item, index })}
                >
                  {itemToString(item)}
                </ComboboxListboxItem>
              ))}
          </ComboboxListbox>
        </ComboboxPopperContent>
      </div>
    </ComboboxPopper>
  );
};

const Property = ({
  meta,
  prop,
  propName,
  component,
  onChange,
  onDelete,
  setCssProperty,
}: {
  prop: Prop | undefined;
  propName: string;
  meta: PropMeta;
  component: Instance["component"];
  onChange: (value: PropValue) => void;
  onDelete?: () => void;
  setCssProperty: SetCssProperty;
}) => (
  <Box css={{ mb: theme.spacing[9] }}>
    {renderControl({
      meta,
      prop,
      propName,
      onDelete,
      onChange: (propValue, asset) => {
        onChange(propValue);

        // @todo: better way to do this?
        if (
          component === "Image" &&
          propName === "src" &&
          asset &&
          "width" in asset.meta &&
          "height" in asset.meta
        ) {
          setCssProperty("aspectRatio")({
            type: "unit",
            unit: "number",
            value: asset.meta.width / asset.meta.height,
          });
        }
      },
    })}
  </Box>
);

const AddPropertyForm = ({
  availableProps,
  onPropSelected,
}: {
  availableProps: NameAndLabel[];
  onPropSelected: (propName: string) => void;
}) => (
  <Box css={{ mb: theme.spacing[9] }}>
    <Combobox
      items={availableProps}
      onItemSelect={(item) => onPropSelected(item.name)}
    />
  </Box>
);

export const PropsPanel = ({
  selectedInstance,
  publish,
}: {
  publish: Publish;
  selectedInstance: Instance;
}) => {
  const [addingProp, setAddingProp] = useState(false);

  const logic = usePropsLogic({
    props: useInstanceProps(selectedInstance.id),
    instance: selectedInstance,
    updateProp: (update) => {
      store.createTransaction([propsStore], (props) => {
        props.set(update.id, update);
      });
    },
    deleteProp: (id) => {
      store.createTransaction([propsStore], (props) => {
        props.delete(id);
      });
    },
  });

  const styleData = useStyleData({ selectedInstance, publish });

  return (
    <Box>
      <Box css={{ p: theme.spacing[9] }}>
        <ComponentInfo selectedInstance={selectedInstance} />
      </Box>
      <CollapsibleSection label="Properties" isOpenDefault>
        <div>
          {logic.initialProps.map(({ prop, propName, meta }) => (
            <Property
              key={propName}
              propName={propName}
              prop={prop}
              meta={meta}
              component={selectedInstance.component}
              onChange={(value) =>
                logic.handleChange({ prop, propName }, value)
              }
              setCssProperty={styleData.setProperty}
            />
          ))}

          {logic.addedProps.map(({ prop, propName, meta }) => (
            <Property
              key={propName}
              propName={propName}
              prop={prop}
              meta={meta}
              component={selectedInstance.component}
              onChange={(value) =>
                logic.handleChange({ prop, propName }, value)
              }
              onDelete={() => logic.handleDelete({ prop, propName })}
              setCssProperty={styleData.setProperty}
            />
          ))}

          {addingProp && (
            <AddPropertyForm
              availableProps={logic.remainingProps}
              onPropSelected={(propName) => {
                setAddingProp(false);
                logic.handleAdd(propName);
              }}
            />
          )}

          <Button
            color="neutral"
            prefix={<PlusIcon />}
            onClick={() => setAddingProp(true)}
          >
            Add property
          </Button>
        </div>
      </CollapsibleSection>
    </Box>
  );
};
