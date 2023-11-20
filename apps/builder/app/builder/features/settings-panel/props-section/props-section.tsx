import { Fragment, useState } from "react";
import { useStore } from "@nanostores/react";
import type { Instance } from "@webstudio-is/sdk";
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
  InputField,
  NestedInputButton,
} from "@webstudio-is/design-system";
import { decodeDataSourceVariable } from "@webstudio-is/react-sdk";
import {
  $propValuesByInstanceSelector,
  dataSourceVariablesStore,
  dataSourcesStore,
  propsIndexStore,
  propsStore,
  selectedInstanceSelectorStore,
} from "~/shared/nano-states";
import { CollapsibleSectionWithAddButton } from "~/builder/shared/collapsible-section";
import {
  useStyleData,
  type SetProperty as SetCssProperty,
} from "~/builder/features/style-panel/shared/use-style-data";
import { renderControl } from "../controls/combined";
import {
  usePropsLogic,
  type NameAndLabel,
  type PropAndMeta,
} from "./use-props-logic";
import { Row, getLabel } from "../shared";
import { serverSyncStore } from "~/shared/sync";

const itemToString = (item: NameAndLabel | null) =>
  item ? getLabel(item, item.name) : "";

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
            placeholder="New Property"
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
  {
    propsLogic: logic,
    setCssProperty,
    component,
    instanceId,
  }: PropsSectionProps,
  { prop, propName, meta }: PropAndMeta,
  deletable?: boolean
) => (
  // fix the issue with changing type while binding expression
  // old prop value is getting preserved in useLocalValue and saved into variable
  // to reproduce try to edit body id prop and then bind json variable to it
  <Fragment key={(prop?.type ?? "") + propName}>
    {renderControl({
      key: propName,
      instanceId,
      meta,
      prop,
      propName,
      deletable: deletable ?? false,
      onDelete: () => {
        if (prop) {
          logic.handleDelete(prop);
        }
      },
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
          logic.handleChangeByPropName("width", {
            value: asset.meta.width,
            type: "number",
          });
          logic.handleChangeByPropName("height", {
            value: asset.meta.height,
            type: "number",
          });

          setCssProperty("height")({
            type: "keyword",
            value: "fit-content",
          });
        }
      },
    })}
  </Fragment>
);

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

type PropsSectionProps = {
  propsLogic: ReturnType<typeof usePropsLogic>;
  component: Instance["component"];
  instanceId: string;
  setCssProperty: SetCssProperty;
};

// A UI componet with minimum logic that can be demoed in Storybook etc.
export const PropsSection = (props: PropsSectionProps) => {
  const { propsLogic: logic } = props;

  const [addingProp, setAddingProp] = useState(false);

  const hasItems =
    logic.addedProps.length > 0 || addingProp || logic.initialProps.length > 0;

  return (
    <>
      <Row css={{ py: theme.spacing[5] }}>
        {logic.systemProps.map((item) => renderProperty(props, item))}
      </Row>

      <Separator />

      <CollapsibleSectionWithAddButton
        label="Properties"
        onAdd={() => setAddingProp(true)}
        hasItems={hasItems}
      >
        <Flex gap="2" direction="column">
          {addingProp && (
            <AddPropertyForm
              availableProps={logic.availableProps}
              onPropSelected={(propName) => {
                setAddingProp(false);
                logic.handleAdd(propName);
              }}
            />
          )}
          {logic.addedProps.map((item) => renderProperty(props, item, true))}
          {logic.initialProps.map((item) => renderProperty(props, item))}
        </Flex>
      </CollapsibleSectionWithAddButton>
    </>
  );
};

const getPropTypeAndValue = (value: unknown) => {
  if (typeof value === "boolean") {
    return { type: "boolean", value } as const;
  }
  if (typeof value === "number") {
    return { type: "number", value } as const;
  }
  if (typeof value === "string") {
    return { type: "string", value } as const;
  }
  // fallback to json
  return { type: "json", value } as const;
};

export const PropsSectionContainer = ({
  selectedInstance: instance,
}: {
  selectedInstance: Instance;
}) => {
  const { setProperty: setCssProperty } = useStyleData({
    selectedInstance: instance,
  });
  const { propsByInstanceId } = useStore(propsIndexStore);
  const propValuesByInstanceSelector = useStore($propValuesByInstanceSelector);
  const instanceSelector = useStore(selectedInstanceSelectorStore);
  const propValues = propValuesByInstanceSelector.get(
    JSON.stringify(instanceSelector)
  );

  const logic = usePropsLogic({
    instance,

    // compute expression prop values before rendering props section
    // to always show already computed values
    props:
      propsByInstanceId.get(instance.id)?.map((prop) => {
        if (prop.type !== "expression") {
          return prop;
        }
        const propValue = propValues?.get(prop.name);
        if (propValue === undefined) {
          return prop;
        }
        return { ...prop, ...getPropTypeAndValue(propValue) };
      }) ?? [],

    updateProp: (update) => {
      const props = propsStore.get();
      const prop = props.get(update.id);
      // update the variable when real prop has expression type
      // update the prop when new expression is added
      if (prop?.type === "expression" && update.type !== "expression") {
        const dataSources = dataSourcesStore.get();
        // when expression contains only reference to variable update that variable
        // extract id without parsing expression
        const potentialVariableId = decodeDataSourceVariable(prop.value);
        if (
          potentialVariableId !== undefined &&
          dataSources.has(potentialVariableId)
        ) {
          const dataSourceId = potentialVariableId;
          const dataSourceVariables = new Map(dataSourceVariablesStore.get());
          dataSourceVariables.set(dataSourceId, update.value);
          dataSourceVariablesStore.set(dataSourceVariables);
        }
      } else {
        const { propsByInstanceId } = propsIndexStore.get();
        serverSyncStore.createTransaction([propsStore], (props) => {
          const instanceProps = propsByInstanceId.get(instance.id) ?? [];
          // Fixing a bug that caused some props to be duplicated on unmount by removing duplicates.
          // see for details https://github.com/webstudio-is/webstudio/pull/2170
          const duplicateProps = instanceProps
            .filter((prop) => prop.id !== update.id)
            .filter((prop) => prop.name === update.name);

          for (const prop of duplicateProps) {
            props.delete(prop.id);
          }

          props.set(update.id, update);
        });
      }
    },

    deleteProp: (propId) => {
      serverSyncStore.createTransaction([propsStore], (props) => {
        props.delete(propId);
      });
    },
  });

  const hasMetaProps = Object.keys(logic.meta.props).length !== 0;

  if (hasMetaProps === false) {
    return null;
  }

  return (
    <PropsSection
      propsLogic={logic}
      component={instance.component}
      instanceId={instance.id}
      setCssProperty={setCssProperty}
    />
  );
};
