import { useStore } from "@nanostores/react";
import store from "immerhin";
import type { Instance, Prop } from "@webstudio-is/project-build";
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
  type CSS,
  InputField,
  NestedInputButton,
} from "@webstudio-is/design-system";
import type { Publish } from "~/shared/pubsub";
import {
  dataSourceValuesStore,
  dataSourcesStore,
  propsIndexStore,
  propsStore,
  registeredComponentPropsMetasStore,
} from "~/shared/nano-states";
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

const itemToString = (item: NameAndLabel | null) =>
  item ? getLabel(item, item.name) : "";

const Row = ({ children, css }: { children: ReactNode; css?: CSS }) => (
  <Flex css={{ px: theme.spacing[9], ...css }} gap="2" direction="column">
    {children}
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
  instanceId: string;
  setCssProperty: SetCssProperty;
};

// A UI componet with minimum logic that can be demoed in Storybook etc.
export const PropsPanel = (props: PropsPanelProps) => {
  const { propsLogic: logic } = props;

  const [addingProp, setAddingProp] = useState(false);

  const hasAddedProps = logic.addedProps.length > 0 || addingProp;

  return (
    <>
      <Row css={{ py: theme.spacing[5] }}>
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
        label="Custom Properties"
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
    </>
  );
};

export const PropsPanelContainer = ({
  selectedInstance: instance,
  publish,
}: {
  publish: Publish;
  selectedInstance: Instance;
}) => {
  const propsMeta = useStore(registeredComponentPropsMetasStore).get(
    instance.component
  );
  const dataSources = useStore(dataSourcesStore);
  const dataSourceValues = useStore(dataSourceValuesStore);
  if (propsMeta === undefined) {
    throw new Error(`Could not get meta for compoent "${instance.component}"`);
  }

  const { setProperty: setCssProperty } = useStyleData({
    selectedInstance: instance,
    publish,
  });

  const { propsByInstanceId } = useStore(propsIndexStore);

  const instanceProps =
    propsByInstanceId.get(instance.id)?.flatMap((prop) => {
      if (prop.type !== "dataSource") {
        return [prop];
      }
      // convert data source prop to typed prop
      const dataSourceId = prop.value;
      const dataSource = dataSources.get(dataSourceId);
      const dataSourceValue = dataSourceValues.get(dataSourceId);
      if (dataSource === undefined) {
        return [];
      }
      return [
        {
          id: prop.id,
          instanceId: prop.instanceId,
          name: prop.name,
          required: prop.required,
          type: dataSource.type,
          // temporary suppression for simplification
          // will be refactored once data sources ui is ready
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          value: (dataSourceValue ?? dataSource?.value) as any,
        } satisfies Prop,
      ];
    }) ?? [];

  const logic = usePropsLogic({
    props: instanceProps,
    meta: propsMeta,
    instanceId: instance.id,
    updateProp: (update) => {
      const props = propsStore.get();
      const prop = props.get(update.id);
      // update data source instead when real prop has data source type
      if (prop?.type === "dataSource") {
        const dataSourceId = prop.value;
        const dataSourceValues = new Map(dataSourceValuesStore.get());
        dataSourceValues.set(dataSourceId, update.value);
        dataSourceValuesStore.set(dataSourceValues);
      } else if (prop) {
        store.createTransaction([propsStore], (props) => {
          props.set(update.id, update);
        });
      }
    },
    deleteProp: (propId) => {
      store.createTransaction([propsStore], (props) => {
        props.delete(propId);
      });
    },
  });

  return (
    <PropsPanel
      propsLogic={logic}
      component={instance.component}
      instanceId={instance.id}
      setCssProperty={setCssProperty}
    />
  );
};
