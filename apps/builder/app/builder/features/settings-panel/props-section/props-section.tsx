import { useState } from "react";
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
import {
  $propValuesByInstanceSelector,
  $propsIndex,
  $props,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { CollapsibleSectionWithAddButton } from "~/builder/shared/collapsible-section";
import { renderControl } from "../controls/combined";
import {
  usePropsLogic,
  type NameAndLabel,
  type PropAndMeta,
} from "./use-props-logic";
import { Row } from "../shared";
import { serverSyncStore } from "~/shared/sync";
import { matchSorter } from "match-sorter";

const itemToString = (item: NameAndLabel | null) =>
  item?.label || item?.name || "";

const matchOrSuggestToCreate = (
  search: string,
  items: Array<NameAndLabel>,
  itemToString: (item: NameAndLabel) => string
): Array<NameAndLabel> => {
  const matched = matchSorter(items, search, {
    keys: [itemToString],
  });

  if (
    search.trim() !== "" &&
    itemToString(matched[0]).toLocaleLowerCase() !==
      search.toLocaleLowerCase().trim()
  ) {
    matched.unshift({
      name: search.trim(),
      label: `Create "${search.trim()}"`,
    });
  }
  return matched;
};

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
    match: matchOrSuggestToCreate,
    // this weird handling of value is needed to work around a limitation in useCombobox
    // where it doesn't allow to leave both `value` and `selectedItem` empty/uncontrolled
    value: { name: "", label: inputValue },
    onInputChange: (value) => setInputValue(value ?? ""),
  });

  return (
    <Combobox open={combobox.isOpen}>
      <div {...combobox.getComboboxProps()}>
        <ComboboxAnchor>
          <InputField
            autoFocus
            {...combobox.getInputProps()}
            placeholder="Find or create a property"
            suffix={<NestedInputButton {...combobox.getToggleButtonProps()} />}
          />
        </ComboboxAnchor>
        <ComboboxContent align="start" sideOffset={2}>
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
  { propsLogic: logic, propValues, component, instanceId }: PropsSectionProps,
  { prop, propName, meta }: PropAndMeta,
  { deletable, autoFocus }: { deletable?: boolean; autoFocus?: boolean } = {}
) =>
  renderControl({
    autoFocus,
    key: propName,
    instanceId,
    meta,
    prop,
    computedValue: propValues.get(propName) ?? meta.defaultValue,
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

type PropsSectionProps = {
  propsLogic: ReturnType<typeof usePropsLogic>;
  propValues: Map<string, unknown>;
  component: Instance["component"];
  instanceId: string;
};

// A UI componet with minimum logic that can be demoed in Storybook etc.
export const PropsSection = (props: PropsSectionProps) => {
  const { propsLogic: logic } = props;

  const [addingProp, setAddingProp] = useState(false);

  const hasItems =
    logic.addedProps.length > 0 || addingProp || logic.initialProps.length > 0;

  return (
    <>
      <Row css={{ py: theme.spacing[3] }}>
        {logic.systemProps.map((item) => renderProperty(props, item))}
      </Row>

      <Separator />

      <CollapsibleSectionWithAddButton
        label="Properties"
        onAdd={() => setAddingProp(true)}
        hasItems={hasItems}
      >
        <Flex gap="1" direction="column">
          {addingProp && (
            <AddPropertyForm
              availableProps={logic.availableProps}
              onPropSelected={(propName) => {
                setAddingProp(false);
                logic.handleAdd(propName);
              }}
            />
          )}
          {logic.addedProps.map((item, index) =>
            renderProperty(props, item, {
              deletable: true,
              autoFocus: index === 0,
            })
          )}
          {logic.initialProps.map((item) => renderProperty(props, item))}
        </Flex>
      </CollapsibleSectionWithAddButton>
    </>
  );
};

export const PropsSectionContainer = ({
  selectedInstance: instance,
}: {
  selectedInstance: Instance;
}) => {
  const { propsByInstanceId } = useStore($propsIndex);
  const propValuesByInstanceSelector = useStore($propValuesByInstanceSelector);
  const instanceSelector = useStore($selectedInstanceSelector);
  const propValues = propValuesByInstanceSelector.get(
    JSON.stringify(instanceSelector)
  );

  const logic = usePropsLogic({
    instance,
    props: propsByInstanceId.get(instance.id) ?? [],

    updateProp: (update) => {
      const { propsByInstanceId } = $propsIndex.get();
      const instanceProps = propsByInstanceId.get(instance.id) ?? [];
      // Fixing a bug that caused some props to be duplicated on unmount by removing duplicates.
      // see for details https://github.com/webstudio-is/webstudio/pull/2170
      const duplicateProps = instanceProps
        .filter((prop) => prop.id !== update.id)
        .filter((prop) => prop.name === update.name);
      serverSyncStore.createTransaction([$props], (props) => {
        for (const prop of duplicateProps) {
          props.delete(prop.id);
        }
        props.set(update.id, update);
      });
    },

    deleteProp: (propId) => {
      serverSyncStore.createTransaction([$props], (props) => {
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
      propValues={propValues ?? new Map()}
      component={instance.component}
      instanceId={instance.id}
    />
  );
};
