import { computed } from "nanostores";
import { useState } from "react";
import { useStore } from "@nanostores/react";
import { matchSorter } from "match-sorter";
import { type Instance, Props, descendantComponent } from "@webstudio-is/sdk";
import {
  theme,
  Combobox,
  Separator,
  Flex,
  Box,
  Grid,
} from "@webstudio-is/design-system";
import { isAttributeNameSafe } from "@webstudio-is/react-sdk";
import {
  $propValuesByInstanceSelector,
  $propsIndex,
  $props,
  $isDesignMode,
  $isContentMode,
  $memoryProps,
  $selectedBreakpoint,
} from "~/shared/nano-states";
import { CollapsibleSectionWithAddButton } from "~/builder/shared/collapsible-section";
import { renderControl } from "../controls/combined";
import { usePropsLogic, type PropAndMeta } from "./use-props-logic";
import { serverSyncStore } from "~/shared/sync";
import { $selectedInstanceKey } from "~/shared/awareness";
import { AnimationSection } from "./animation/animation-section";
import { nanoid } from "nanoid";
import { $matchingBreakpoints } from "../../style-panel/shared/model";
import { matchMediaBreakpoints } from "./match-media-breakpoints";

type Item = {
  name: string;
  label?: string;
  description?: string;
};

const itemToString = (item: Item | null) => item?.label || item?.name || "";

const matchOrSuggestToCreate = (
  search: string,
  items: Array<Item>,
  itemToString: (item: Item) => string
): Array<Item> => {
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
      label: `Create attribute: "${search.trim()}"`,
    });
  }
  return matched;
};

const renderProperty = (
  { propsLogic: logic, propValues, component, instanceId }: PropsSectionProps,
  { prop, propName, meta }: PropAndMeta
) =>
  renderControl({
    key: propName,
    instanceId,
    meta,
    prop,
    computedValue: propValues.get(propName) ?? meta.defaultValue,
    propName,
    onChange: (propValue) => {
      logic.handleChange({ prop, propName }, propValue);

      if (
        component === "Image" &&
        propName === "src" &&
        propValue.type === "asset"
      ) {
        logic.handleChangeByPropName("width", propValue);
        logic.handleChangeByPropName("height", propValue);
      }
    },
  });

const forbiddenProperties = new Set(["style", "class", "className"]);

const AddPropertyOrAttribute = ({
  availableProps,
  onPropSelected,
}: {
  availableProps: Item[];
  onPropSelected: (propName: string) => void;
}) => {
  const [value, setValue] = useState("");
  const [isValid, setIsValid] = useState(true);
  return (
    <Flex
      css={{ height: theme.spacing[13] }}
      direction="column"
      justify="center"
    >
      <Combobox<Item>
        defaultHighlightedIndex={0}
        autoFocus
        color={isValid ? undefined : "error"}
        placeholder="Select or create"
        getItems={() => availableProps}
        itemToString={itemToString}
        onItemSelect={(item) => {
          if (
            forbiddenProperties.has(item.name) ||
            isAttributeNameSafe(item.name) === false
          ) {
            setIsValid(false);
            return;
          }
          setIsValid(true);
          onPropSelected(item.name);
        }}
        match={matchOrSuggestToCreate}
        value={{ name: "", label: value }}
        onChange={(value) => {
          setValue(value ?? "");
        }}
        getDescription={(item) => {
          return (
            <Box css={{ width: theme.spacing[28] }}>
              {item?.description ?? "No description available"}
            </Box>
          );
        }}
      />
    </Flex>
  );
};

type PropsSectionProps = {
  propsLogic: ReturnType<typeof usePropsLogic>;
  propValues: Map<string, unknown>;
  component: Instance["component"];
  instanceId: string;
  selectedInstanceKey: string;
};

// A UI componet with minimum logic that can be demoed in Storybook etc.
export const PropsSection = (props: PropsSectionProps) => {
  const { propsLogic: logic } = props;
  const [addingProp, setAddingProp] = useState(false);
  const isDesignMode = useStore($isDesignMode);
  const isContentMode = useStore($isContentMode);
  const matchingBreakpoints = useStore($matchingBreakpoints);
  const selectedBreakpoint = useStore($selectedBreakpoint);

  const matchMediaValue = matchMediaBreakpoints(matchingBreakpoints);

  const hasItems =
    logic.addedProps.length > 0 || addingProp || logic.initialProps.length > 0;

  const animationAction = logic.initialProps.find(
    (prop) => prop.meta.type === "animationAction"
  );

  const hasAnimation = animationAction !== undefined;

  const showPropertiesSection =
    isDesignMode || (isContentMode && logic.initialProps.length > 0);

  return hasAnimation && selectedBreakpoint?.id !== undefined ? (
    <>
      <AnimationSection
        animationAction={animationAction}
        isAnimationEnabled={matchMediaValue}
        selectedBreakpointId={selectedBreakpoint?.id}
        onChange={(value, isEphemeral) => {
          const memoryProps = new Map($memoryProps.get());
          const memoryInstanceProp: Props = new Map(
            memoryProps.get(props.selectedInstanceKey)
          );

          if (isEphemeral && value !== undefined) {
            memoryInstanceProp.set(animationAction.propName, {
              id: nanoid(),
              instanceId: props.instanceId,
              type: "animationAction",
              name: animationAction.propName,
              value,
            });
            memoryProps.set(props.selectedInstanceKey, memoryInstanceProp);
            $memoryProps.set(memoryProps);
            return;
          }

          if (memoryInstanceProp.has(animationAction.propName)) {
            memoryInstanceProp.delete(animationAction.propName);
            memoryProps.set(props.selectedInstanceKey, memoryInstanceProp);

            $memoryProps.set(memoryProps);
          }

          if (isEphemeral || value === undefined) {
            return;
          }

          isEphemeral satisfies false;

          logic.handleChangeByPropName(animationAction.propName, {
            type: "animationAction",
            value,
          });
        }}
      />
    </>
  ) : (
    <>
      <Grid
        css={{
          paddingBottom: theme.panel.paddingBlock,
        }}
      >
        {logic.systemProps.map((item) => (
          <Box
            key={item.propName}
            css={{ paddingInline: theme.panel.paddingInline }}
          >
            {renderProperty(props, item)}
          </Box>
        ))}
      </Grid>

      <Separator />
      {showPropertiesSection && (
        <CollapsibleSectionWithAddButton
          label="Properties & Attributes"
          onAdd={isDesignMode ? () => setAddingProp(true) : undefined}
          hasItems={hasItems}
        >
          <Flex gap="1" direction="column">
            {addingProp && (
              <AddPropertyOrAttribute
                availableProps={logic.availableProps}
                onPropSelected={(propName) => {
                  setAddingProp(false);
                  logic.handleAdd(propName);
                }}
              />
            )}
            {logic.addedProps.map((item) => renderProperty(props, item))}
            {logic.initialProps.map((item) => renderProperty(props, item))}
          </Flex>
        </CollapsibleSectionWithAddButton>
      )}
    </>
  );
};

const $propValues = computed(
  [$propValuesByInstanceSelector, $selectedInstanceKey],
  (propValuesByInstanceSelector, instanceKey) =>
    propValuesByInstanceSelector.get(instanceKey ?? "")
);

export const PropsSectionContainer = ({
  selectedInstance: instance,
  selectedInstanceKey,
}: {
  selectedInstance: Instance;
  selectedInstanceKey: string;
}) => {
  const { propsByInstanceId } = useStore($propsIndex);
  const propValues = useStore($propValues);

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
  });

  const hasMetaProps = Object.keys(logic.meta.props).length !== 0;

  if (hasMetaProps === false) {
    return null;
  }

  return (
    <fieldset
      style={{ display: "contents" }}
      disabled={instance.component === descendantComponent}
    >
      <PropsSection
        propsLogic={logic}
        propValues={propValues ?? new Map()}
        component={instance.component}
        instanceId={instance.id}
        selectedInstanceKey={selectedInstanceKey}
      />
    </fieldset>
  );
};
