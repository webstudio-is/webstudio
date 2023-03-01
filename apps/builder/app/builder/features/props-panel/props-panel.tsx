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
  Separator,
  Flex,
  Text,
} from "@webstudio-is/design-system";
import { ChevronDownIcon, PlusIcon } from "@webstudio-is/icons";
import type { Publish } from "~/shared/pubsub";
import { propsStore, useInstanceProps } from "~/shared/nano-states";
import { CollapsibleSection } from "~/builder/shared/inspector";
import {
  useStyleData,
  type SetProperty as SetCssProperty,
} from "~/builder/features/style-panel/shared/use-style-data";
import { renderControl } from "./controls/combined";
import { usePropsLogic, type NameAndLabel } from "./use-props-logic";
import { type PropMeta, type PropValue, getLabel } from "./shared";
import { useState } from "react";
import {
  getComponentPropsMeta,
  getComponentMeta,
  type WsComponentMeta,
} from "@webstudio-is/react-sdk";

const itemToString = (item: NameAndLabel | null) =>
  item ? getLabel(item, item.name) : "";

const Row = ({ children }: { children: React.ReactNode }) => (
  <Flex css={{ px: theme.spacing[9] }} gap="2" direction="column">
    {children}
  </Flex>
);

const InstanceInfo = ({
  componentMeta,
}: {
  componentMeta: WsComponentMeta;
}) => (
  <Flex
    gap="1"
    css={{ height: theme.spacing[13], color: theme.colors.foregroundSubtle }}
    align="center"
  >
    <componentMeta.Icon />{" "}
    <Text truncate variant="labelsSentenceCase">
      {componentMeta.label}
    </Text>
  </Flex>
);

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

// @todo:
//   at this point we need the <Property> wrapper only because
//   of complicated `onChange` inside.
//   need to refactor this somehow
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
}) =>
  renderControl({
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
  });

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

// A UI componet with minimum logic that can be demoed in Storybook etc.
export const PropsPanelUI = ({
  propsLogic: logic,
  component,
  componentMeta,
  setCssProperty,
}: {
  propsLogic: ReturnType<typeof usePropsLogic>;
  component: Instance["component"];
  componentMeta: WsComponentMeta;
  setCssProperty: SetCssProperty;
}) => {
  const [addingProp, setAddingProp] = useState(false);

  return (
    <Box css={{ paddingTop: theme.spacing[3] }}>
      <Row>
        <InstanceInfo componentMeta={componentMeta} />
      </Row>
      <Box
        // @todo: make this Box a `gap` or something
        css={{ height: theme.spacing[3] }}
      />
      <Row>
        {logic.initialProps.map(({ prop, propName, meta }) => (
          <Property
            key={propName}
            propName={propName}
            prop={prop}
            meta={meta}
            component={component}
            onChange={(value) => logic.handleChange({ prop, propName }, value)}
            setCssProperty={setCssProperty}
          />
        ))}
      </Row>

      <Separator />

      {/* @todo: 
            need to refactor or add a new CollapsibleSection, 
            this one has a wrong layout/design 
       */}
      <CollapsibleSection label="Properties" isOpenDefault>
        <Flex gap="2" direction="column">
          {logic.addedProps.map(({ prop, propName, meta }) => (
            <Property
              key={propName}
              propName={propName}
              prop={prop}
              meta={meta}
              component={component}
              onChange={(value) =>
                logic.handleChange({ prop, propName }, value)
              }
              onDelete={() => logic.handleDelete({ prop, propName })}
              setCssProperty={setCssProperty}
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
        </Flex>
      </CollapsibleSection>
    </Box>
  );
};

export const PropsPanel = ({
  selectedInstance: instance,
  publish,
}: {
  publish: Publish;
  selectedInstance: Instance;
}) => {
  const propsMeta = getComponentPropsMeta(instance.component);
  if (propsMeta === undefined) {
    throw new Error(`Could not get meta for compoent "${instance.component}"`);
  }

  const componentMeta = getComponentMeta(instance.component);
  if (componentMeta === undefined) {
    throw new Error(`Could not get meta for compoent "${instance.component}"`);
  }

  const { setProperty: setCssProperty } = useStyleData({
    selectedInstance: instance,
    publish,
  });

  const logic = usePropsLogic({
    props: useInstanceProps(instance.id),
    meta: propsMeta,
    instanceId: instance.id,
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

  return (
    <PropsPanelUI
      propsLogic={logic}
      component={instance.component}
      componentMeta={componentMeta}
      setCssProperty={setCssProperty}
    />
  );
};
