import store from "immerhin";
import type { Instance } from "@webstudio-is/project-build";
import {
  theme,
  useCombobox,
  Combobox,
  ComboboxContent,
  ComboboxAnchor,
  ComboboxListbox,
  ComboboxListboxItem,
  Separator,
  Flex,
  Text,
  type CSS,
  ScrollArea,
  InputField,
  NestedInputButton,
} from "@webstudio-is/design-system";
import type { Publish } from "~/shared/pubsub";
import { propsStore, useInstanceProps } from "~/shared/nano-states";
import { CollapsibleSectionWithAddButton } from "~/builder/shared/collapsible-section";
import {
  useStyleData,
  type SetProperty as SetCssProperty,
} from "~/builder/features/style-panel/shared/use-style-data";
import { renderControl } from "./controls/combined";
import {
  usePropsLogic,
  type NameAndLabel,
  type PropAndMeta,
} from "./use-props-logic";
import { getLabel } from "./shared";
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

const PropsCombobox = ({
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
    <Combobox>
      <div {...combobox.getComboboxProps()}>
        <ComboboxAnchor>
          <InputField
            autoFocus
            {...combobox.getInputProps()}
            placeholder="Property"
            suffix={<NestedInputButton {...combobox.getToggleButtonProps()} />}
          />
        </ComboboxAnchor>
        <ComboboxContent align="end" sideOffset={5}>
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
        </ComboboxContent>
      </div>
    </Combobox>
  );
};

const renderProperty = (
  { propsLogic: logic, setCssProperty, component, instanceId }: PropsPanelProps,
  { prop, propName, meta }: PropAndMeta,
  deletable?: boolean
) =>
  renderControl({
    key: propName,
    instanceId,
    meta,
    prop,
    propName,
    onDelete: deletable
      ? () => logic.handleDelete({ prop, propName })
      : undefined,
    onSoftDelete: () => prop && logic.handleSoftDelete(prop),
    onChange: (propValue, asset) => {
      logic.handleChange({ prop, propName }, propValue);

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
    <PropsCombobox
      items={availableProps}
      onItemSelect={(item) => onPropSelected(item.name)}
    />
  </Flex>
);

type PropsPanelProps = {
  propsLogic: ReturnType<typeof usePropsLogic>;
  component: Instance["component"];
  instanceLabel: string;
  instanceId: string;
  componentMeta: WsComponentMeta;
  setCssProperty: SetCssProperty;
};

// A UI componet with minimum logic that can be demoed in Storybook etc.
export const PropsPanel = (props: PropsPanelProps) => {
  const { propsLogic: logic, instanceLabel, componentMeta } = props;

  const [addingProp, setAddingProp] = useState(false);

  const hasAddedProps = logic.addedProps.length > 0 || addingProp;

  return (
    <ScrollArea css={{ paddingTop: theme.spacing[3] }}>
      <Row>
        <InstanceInfo meta={componentMeta} label={instanceLabel} />
      </Row>

      <Row
        css={{
          paddingTop: theme.spacing[3],
          paddingBottom: theme.spacing[5],
        }}
      >
        {logic.systemProps.map((item) => renderProperty(props, item))}
      </Row>

      <Separator />

      {logic.initialProps.length > 0 && (
        <>
          <Row
            css={{
              paddingTop: theme.spacing[5],
              paddingBottom: theme.spacing[5],
            }}
          >
            {logic.initialProps.map((item) => renderProperty(props, item))}
          </Row>
          <Separator />
        </>
      )}

      <CollapsibleSectionWithAddButton
        label="Properties"
        onAdd={() => setAddingProp(true)}
        hasItems={hasAddedProps}
      >
        {hasAddedProps && (
          <Flex gap="2" direction="column">
            {logic.addedProps.map((item) => renderProperty(props, item, true))}
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
        )}
      </CollapsibleSectionWithAddButton>
    </ScrollArea>
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
      instanceId={instance.id}
      instanceLabel={instanceLabel}
      componentMeta={componentMeta}
      setCssProperty={setCssProperty}
    />
  );
};
