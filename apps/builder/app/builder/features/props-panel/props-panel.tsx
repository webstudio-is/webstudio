import store from "immerhin";
import type { Instance, Prop } from "@webstudio-is/project-build";
import {
  theme,
  Box,
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
  CSS,
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
import { useState, type ReactNode } from "react";
import {
  getComponentPropsMeta,
  getComponentMeta,
  type WsComponentMeta,
} from "@webstudio-is/react-sdk";
import { getInstanceLabel } from "~/builder/shared/tree";

const itemToString = (item: NameAndLabel | null) =>
  item ? getLabel(item, item.name) : "";

const Row = ({ children, css }: { children: ReactNode; css?: CSS }) => (
  <Flex css={{ px: theme.spacing[9], ...css }} gap="2" direction="column">
    {children}
  </Flex>
);

const InstanceInfo = ({
  meta,
  label,
}: {
  label: string;
  meta: WsComponentMeta;
}) => (
  <Flex
    gap="1"
    css={{ height: theme.spacing[13], color: theme.colors.foregroundSubtle }}
    align="center"
  >
    <meta.Icon />{" "}
    <Text truncate variant="labelsSentenceCase">
      {label}
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
  onSoftDelete,
  setCssProperty,
}: {
  prop: Prop | undefined;
  propName: string;
  meta: PropMeta;
  component: Instance["component"];
  onChange: (value: PropValue) => void;
  onDelete?: () => void;
  onSoftDelete: () => void;
  setCssProperty: SetCssProperty;
}) =>
  renderControl({
    meta,
    prop,
    propName,
    onDelete,
    onSoftDelete,
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
  <Flex css={{ height: theme.spacing[13] }} direction="column" justify="center">
    <Combobox
      items={availableProps}
      onItemSelect={(item) => onPropSelected(item.name)}
    />
  </Flex>
);

// A UI componet with minimum logic that can be demoed in Storybook etc.
export const PropsPanel = ({
  propsLogic: logic,
  component,
  instanceLabel,
  componentMeta,
  setCssProperty,
}: {
  propsLogic: ReturnType<typeof usePropsLogic>;
  component: Instance["component"];
  instanceLabel: string;
  componentMeta: WsComponentMeta;
  setCssProperty: SetCssProperty;
}) => {
  const [addingProp, setAddingProp] = useState(false);

  return (
    <Box css={{ paddingTop: theme.spacing[3] }}>
      <Row>
        <InstanceInfo meta={componentMeta} label={instanceLabel} />
      </Row>

      <Row
        css={{
          paddingTop: theme.spacing[3],
          paddingBottom: theme.spacing[5],
        }}
      >
        {logic.initialProps.map(({ prop, propName, meta }) => (
          <Property
            key={propName}
            propName={propName}
            prop={prop}
            meta={meta}
            component={component}
            onChange={(value) => logic.handleChange({ prop, propName }, value)}
            onSoftDelete={() => prop && logic.handleSoftDelete(prop)}
            setCssProperty={setCssProperty}
          />
        ))}
      </Row>

      <Separator />
      <CollapsibleSection
        label="Properties"
        isOpenDefault
        rightSlot={
          <SmallIconButton
            icon={<PlusIcon />}
            onClick={(event) => {
              // to prevent the section from collapsing/expanding
              event.stopPropagation();
              setAddingProp(true);
            }}
          />
        }
      >
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
              onSoftDelete={() => prop && logic.handleSoftDelete(prop)}
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
        </Flex>
      </CollapsibleSection>
      <Separator />
    </Box>
  );
};

export const PropsPanelContainer = ({
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

  const instanceLabel = getInstanceLabel(instance, componentMeta);

  return (
    <PropsPanel
      propsLogic={logic}
      component={instance.component}
      instanceLabel={instanceLabel}
      componentMeta={componentMeta}
      setCssProperty={setCssProperty}
    />
  );
};
