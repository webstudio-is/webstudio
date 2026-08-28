import { nanoid } from "nanoid";
import { useState } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import { matchSorter } from "match-sorter";
import {
  type Instance,
  type Prop,
  type Props,
  blockComponent,
  contentBlockSourceProp,
  toAssetReferenceRuntimeData,
  descendantComponent,
  rootComponent,
} from "@webstudio-is/sdk";
import {
  theme,
  Combobox,
  Separator,
  Flex,
  Box,
  Grid,
  toast,
} from "@webstudio-is/design-system";
import {
  isAttributeNameSafe,
  reactPropsToStandardAttributes,
  showAttribute,
  standardAttributesToReactProps,
} from "@webstudio-is/react-sdk";
import {
  $propValuesByInstanceSelector,
  $propsIndex,
  $isDesignMode,
  $isContentMode,
  $memoryProps,
  $selectedBreakpoint,
} from "~/shared/nano-states";
import {
  $assetFolders,
  $assets,
  $instances,
  $props,
} from "~/shared/sync/data-stores";
import { CollapsibleSectionWithAddButton } from "~/builder/shared/collapsible-section";
import {
  $selectedInstance,
  $selectedInstanceKey,
  $selectedInstanceSelector,
  getInstanceKey,
} from "~/shared/nano-states";
import { renderControl } from "../controls/combined";
import { usePropsLogic, type PropAndMeta } from "./use-props-logic";
import { AnimationSection } from "./animation/animation-section";
import { $matchingBreakpoints } from "../../style-panel/shared/model";
import { matchMediaBreakpoints } from "./match-media-breakpoints";
import {
  $selectedInstanceInitialPropNames,
  $selectedInstancePropsMetas,
} from "../shared";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { ContentBlockSourceSection } from "../controls/content-block-source-section";
import {
  $externalContentRoots,
  findExternalContentRootEntryBySelector,
} from "~/shared/external-content-mutations";
import { updateExternalContentFrontmatter } from "~/shared/external-content-roots";
import {
  getSelectedContentBlockDocumentBindingPath,
  isObjectPathWritable,
} from "~/shared/content-block-document";
import {
  createMdxAssetReferenceValues,
  findProp,
} from "@webstudio-is/project-build/runtime";
import { resolveAssetValueReferences } from "@webstudio-is/content-engine";

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
  if (search.trim() === "") {
    return items;
  }
  const matched = matchSorter(items, search, {
    keys: [itemToString],
  });
  if (
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

const shouldShowPropertiesSection = ({
  isDesignMode,
  isContentMode,
  hasProperties,
}: {
  isDesignMode: boolean;
  isContentMode: boolean;
  hasProperties: boolean;
}) => {
  return isDesignMode || (isContentMode && hasProperties);
};

const shouldRenderPropsSectionContainer = ({
  component,
  propsMetasSize,
  hasVisibleProps,
  isContentMode,
  isDesignMode,
}: {
  component: Instance["component"];
  propsMetasSize: number;
  hasVisibleProps: boolean;
  isContentMode: boolean;
  isDesignMode: boolean;
}) => {
  if (component === rootComponent) {
    return false;
  }
  if (component === blockComponent) {
    return isDesignMode || (isContentMode && hasVisibleProps);
  }
  return propsMetasSize > 0 || (isContentMode && hasVisibleProps);
};

const shouldSyncMediaAssetProps = ({
  component,
  propName,
  propValue,
  propType,
}: {
  component: Instance["component"];
  propName: string;
  propValue: { type: string };
  propType?: Prop["type"];
}) =>
  (component === "Image" || component === "Video") &&
  propName === "src" &&
  propValue.type === "asset" &&
  propType !== "expression";

const findExpressionPropByStandardName = ({
  props,
  instanceId,
  propName,
}: {
  props: readonly Prop[];
  instanceId: Instance["id"];
  propName: Prop["name"];
}) => {
  const findExpression = (name: string) => {
    const prop = findProp(props, instanceId, name);
    return prop?.type === "expression" ? prop : undefined;
  };
  const reactPropName = standardAttributesToReactProps[propName];
  return (
    findExpression(propName) ??
    (reactPropName === undefined ? undefined : findExpression(reactPropName))
  );
};

const renderProperty = (
  {
    propsLogic: logic,
    propValues,
    propValuesByInstanceSelector,
    component,
    instanceId,
    selectedInstanceKey,
  }: PropsSectionProps,
  item: PropAndMeta
) => {
  const { prop, propName, meta } = item;
  if (component === blockComponent && propName === contentBlockSourceProp) {
    return (
      <ContentBlockSourceSection
        key={propName}
        blockInstanceId={instanceId}
        renderScope={selectedInstanceKey}
      />
    );
  }
  const targetInstanceId = item.instanceId ?? instanceId;
  const targetPropValues =
    item.instanceSelector === undefined
      ? propValues
      : (propValuesByInstanceSelector.get(
          getInstanceKey(item.instanceSelector)
        ) ?? propValues);

  return renderControl({
    key: propName,
    instanceId: targetInstanceId,
    meta,
    prop,
    computedProps: targetPropValues,
    computedValue:
      targetPropValues.get(propName) ??
      // support legacy html props with react names
      targetPropValues.get(standardAttributesToReactProps[propName]) ??
      meta.defaultValue,
    propName,
    onChange: (propValue) => {
      logic.handleChange({ prop, propName }, propValue);

      if (
        shouldSyncMediaAssetProps({
          component,
          propName,
          propValue,
          propType: prop?.type,
        })
      ) {
        logic.handleChangeByPropName("width", propValue);
        logic.handleChangeByPropName("height", propValue);
        logic.handleChangeByPropName("alt", propValue);
      }
    },
  });
};

const forbiddenProperties = new Set(["style"]);

const $availableProps = computed(
  [
    $selectedInstance,
    $props,
    $selectedInstancePropsMetas,
    $selectedInstanceInitialPropNames,
  ],
  (instance, props, propsMetas, initialPropNames) => {
    const availableProps = new Map<Item["name"], Item>();
    for (const [name, { label, description }] of propsMetas) {
      if (name === showAttribute) {
        continue;
      }
      availableProps.set(name, { name, label, description });
    }
    if (instance === undefined) {
      return [];
    }
    // remove initial props
    for (const name of initialPropNames) {
      availableProps.delete(name);
    }
    // remove defined props
    for (const prop of props.values()) {
      if (prop.instanceId === instance.id) {
        availableProps.delete(prop.name);
        availableProps.delete(reactPropsToStandardAttributes[prop.name]);
      }
    }
    return Array.from(availableProps.values());
  }
);

const AddPropertyOrAttribute = ({
  onPropSelected,
}: {
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
        autoFocus
        color={isValid ? undefined : "error"}
        placeholder="Select or create"
        // lazily load available props to not bloat component renders
        getItems={() => $availableProps.get()}
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
  propValuesByInstanceSelector: Map<string, Map<string, unknown>>;
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

  const addedProps = logic.addedProps;
  const initialProps = logic.initialProps;
  const hasProperties = addedProps.length > 0 || initialProps.length > 0;
  const hasItems = hasProperties || (isDesignMode && addingProp);

  const animationAction = logic.initialProps.find(
    (prop) => prop.meta.type === "animationAction"
  );

  const hasAnimation = animationAction !== undefined;

  const showPropertiesSection = shouldShowPropertiesSection({
    isDesignMode,
    isContentMode,
    hasProperties,
  });

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
          label="Properties & attributes"
          onAdd={isDesignMode ? () => setAddingProp(true) : undefined}
          hasItems={hasItems}
        >
          <Flex gap="1" direction="column">
            {isDesignMode && addingProp && (
              <AddPropertyOrAttribute
                onPropSelected={(propName) => {
                  setAddingProp(false);
                  logic.handleAdd(propName);
                }}
              />
            )}
            {addedProps.map((item) => renderProperty(props, item))}
            {initialProps.map((item) => renderProperty(props, item))}
          </Flex>
        </CollapsibleSectionWithAddButton>
      )}
    </>
  );
};

export const __testing__ = {
  shouldShowPropertiesSection,
  shouldRenderPropsSectionContainer,
  shouldSyncMediaAssetProps,
  findExpressionPropByStandardName,
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
  const propValuesByInstanceSelector = useStore($propValuesByInstanceSelector);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const externalContentRoots = useStore($externalContentRoots);
  const assets = useStore($assets);
  const assetFolders = useStore($assetFolders);

  const logic = usePropsLogic({
    instance,
    props: propsByInstanceId.get(instance.id) ?? [],

    updateProp: (update) => {
      const originalProp = findExpressionPropByStandardName({
        props: propsByInstanceId.get(instance.id) ?? [],
        instanceId: instance.id,
        propName: update.name,
      });
      const externalEntry =
        selectedInstanceSelector === undefined
          ? undefined
          : findExternalContentRootEntryBySelector(
              externalContentRoots,
              selectedInstanceSelector
            );
      if (originalProp?.type === "expression") {
        const candidateRoot = externalEntry?.[1];
        const path =
          selectedInstanceSelector === undefined
            ? undefined
            : getSelectedContentBlockDocumentBindingPath({
                expression: originalProp.value,
                instanceSelector: selectedInstanceSelector,
                instances: $instances.get(),
                props: $props.get(),
                sourceBlockInstanceId:
                  candidateRoot?.sourceBlockInstanceId ??
                  candidateRoot?.blockInstanceId,
              });
        if (path !== undefined && externalEntry === undefined) {
          toast.error("The MDX content source is not ready for editing.");
          return;
        }
        if (path === undefined || externalEntry === undefined) {
          executeRuntimeMutation({
            id: "instances.updateProps",
            input: { updates: [update] },
          });
          return;
        }
        const [rootKey, externalRoot] = externalEntry;
        let targetPath = path;
        let nextValue: unknown = update.value;
        let nextResolvedValue: unknown = update.value;
        if (update.type === "asset" && externalRoot.identity !== undefined) {
          const sourceAsset = assets.get(externalRoot.identity.assetId);
          const targetAsset = assets.get(update.value);
          const reference =
            sourceAsset === undefined || targetAsset === undefined
              ? undefined
              : createMdxAssetReferenceValues({
                  source: sourceAsset,
                  assets: assets.values(),
                  assetFolders,
                }).get(targetAsset.id);
          if (reference !== undefined && targetAsset !== undefined) {
            targetPath =
              path.length > 1 && path.at(-1) === "src"
                ? path.slice(0, -1)
                : path;
            nextValue = { $ref: reference };
            nextResolvedValue = resolveAssetValueReferences({
              value: nextValue,
              references: [
                {
                  path: [],
                  assetId: targetAsset.id,
                  structured: true,
                },
              ],
              runtimeAssets: {
                [targetAsset.id]: toAssetReferenceRuntimeData(
                  targetAsset,
                  window.location.origin
                ),
              },
            });
          }
        }
        if (externalRoot.document === undefined) {
          toast.error("The MDX content source is not ready for editing.");
          return;
        }
        if (
          isObjectPathWritable({
            value: externalRoot.document.frontmatter.properties,
            path: targetPath,
          }) === false
        ) {
          toast.error("Open the referenced file to edit this value.");
          return;
        }
        if (update.type === "asset" && typeof nextValue !== "object") {
          toast.error(
            "The selected Asset cannot be referenced from this file."
          );
          return;
        }
        void updateExternalContentFrontmatter({
          rootKey,
          path: targetPath,
          value: nextValue,
          resolvedValue: nextResolvedValue,
        }).catch((error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to update MDX frontmatter"
          );
        });
        return;
      }
      executeRuntimeMutation({
        id: "instances.updateProps",
        input: {
          updates: [update],
        },
      });
    },
  });

  const propsMetas = useStore($selectedInstancePropsMetas);
  const isContentMode = useStore($isContentMode);
  const isDesignMode = useStore($isDesignMode);
  const hasVisibleProps =
    logic.systemProps.length > 0 ||
    logic.initialProps.length > 0 ||
    logic.addedProps.length > 0;
  if (
    shouldRenderPropsSectionContainer({
      component: instance.component,
      propsMetasSize: propsMetas.size,
      hasVisibleProps,
      isContentMode,
      isDesignMode,
    }) === false
  ) {
    return;
  }

  return (
    <fieldset
      style={{ display: "contents" }}
      disabled={instance.component === descendantComponent}
    >
      <PropsSection
        propsLogic={logic}
        propValues={propValues ?? new Map()}
        propValuesByInstanceSelector={propValuesByInstanceSelector}
        component={instance.component}
        instanceId={instance.id}
        selectedInstanceKey={selectedInstanceKey}
      />
    </fieldset>
  );
};
