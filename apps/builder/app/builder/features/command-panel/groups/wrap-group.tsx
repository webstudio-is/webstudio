import {
  CommandGroup,
  CommandIcon,
  CommandInput,
  CommandItem,
  CommandList,
  CommandBackButton,
  CommandFooter,
  Flex,
  ScrollArea,
  Text,
} from "@webstudio-is/design-system";
import { matchSorter } from "match-sorter";
import { computed } from "nanostores";
import { elementComponent, tags } from "@webstudio-is/sdk";
import type {
  Instance,
  Instances,
  Props,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  $instances,
  $props,
  $registeredComponentMetas,
} from "~/shared/nano-states";
import { $selectedInstancePath } from "~/shared/awareness";
import {
  getInstanceLabel,
  InstanceIcon,
} from "~/builder/shared/instance-label";
import { isTreeSatisfyingContentModel } from "~/shared/content-model";
import {
  $commandContent,
  $isCommandPanelOpen,
  closeCommandPanel,
  openCommandPanel,
} from "../command-state";
import { useState } from "react";
import { wrapInstance } from "~/shared/instance-utils";

type WrapOption = {
  component: string;
  tag?: string;
  label: string;
  category?: string;
  order?: number;
};

// Component names we want to allow as wrappers
// These will be looked up in the registered metas to get the full namespaced name
const wrapperComponentNames = [
  "Element",
  "Slot",
  "Collection",
  "AnimateChildren",
  "AnimateText",
  "StaggerAnimation",
  "VideoAnimation",
  "Form",
];

// Check if an instance can be wrapped with a specific component or tag
const canWrapInstance = (
  selectedInstanceId: string,
  selectedInstanceSelector: string[],
  parentInstanceId: string,
  component: string,
  tag: string | undefined,
  instances: Instances,
  props: Props,
  metas: Map<Instance["component"], WsComponentMeta>
): boolean => {
  const selectedInstance = instances.get(selectedInstanceId);
  const parentInstance = instances.get(parentInstanceId);

  if (!selectedInstance || !parentInstance) {
    return false;
  }

  const wrapperInstance: Instance = {
    type: "instance",
    id: "wrapper_instance",
    component,
    children: [{ type: "id", value: selectedInstanceId }],
  };

  if (tag || component === elementComponent) {
    wrapperInstance.tag = tag ?? "div";
  } else {
    // For components with presetStyle (like Heading, Box), infer default tag
    const meta = metas.get(component);
    const defaultTag = Object.keys(
      (meta as { presetStyle?: Record<string, unknown> })?.presetStyle ?? {}
    ).at(0);
    if (defaultTag) {
      wrapperInstance.tag = defaultTag;
    }
  }

  const newInstances = new Map(instances);
  newInstances.set(wrapperInstance.id, wrapperInstance);

  // Update parent to point to wrapper
  const newParentInstance = { ...parentInstance };
  newParentInstance.children = parentInstance.children.map((child) => {
    if (child.type === "id" && child.value === selectedInstanceId) {
      return { type: "id", value: wrapperInstance.id };
    }
    return child;
  });
  newInstances.set(parentInstance.id, newParentInstance);

  // Validate the wrapper in the parent
  const wrapperValid = isTreeSatisfyingContentModel({
    instances: newInstances,
    props,
    metas,
    instanceSelector: [
      wrapperInstance.id,
      ...selectedInstanceSelector.slice(1),
    ],
  });

  if (!wrapperValid) {
    return false;
  }

  // Validate the selected instance inside the wrapper
  const childValid = isTreeSatisfyingContentModel({
    instances: newInstances,
    props,
    metas,
    instanceSelector: [
      selectedInstanceId,
      wrapperInstance.id,
      ...selectedInstanceSelector.slice(1),
    ],
  });

  return childValid;
};

const $wrapOptions = computed(
  [
    $isCommandPanelOpen,
    $selectedInstancePath,
    $instances,
    $props,
    $registeredComponentMetas,
  ],
  (isOpen, instancePath, instances, props, metas) => {
    const wrapOptions: WrapOption[] = [];
    if (!isOpen) {
      return wrapOptions;
    }
    if (instancePath === undefined || instancePath.length === 1) {
      return wrapOptions;
    }
    const [selectedItem, parentItem] = instancePath;

    // Build list of allowed wrappers from registered metas
    const allowedComponents: string[] = [];
    for (const [componentName, meta] of metas) {
      // Check if this component is in our wrapper list by:
      // 1. Exact component name match
      // 2. Label match
      // 3. Ends with wrapper name after namespace (e.g., "namespace:WrapperName")
      const matchesName = wrapperComponentNames.includes(componentName);
      const matchesLabel =
        meta.label && wrapperComponentNames.includes(meta.label);
      const matchesNamespacedName = wrapperComponentNames.some((wrapperName) =>
        componentName.endsWith(`:${wrapperName}`)
      );

      if (matchesName || matchesLabel || matchesNamespacedName) {
        allowedComponents.push(componentName);
      }
    }

    // Test each allowed component
    for (const component of allowedComponents) {
      if (
        canWrapInstance(
          selectedItem.instance.id,
          selectedItem.instanceSelector,
          parentItem.instance.id,
          component,
          undefined,
          instances,
          props,
          metas
        )
      ) {
        const meta = metas.get(component);
        const label = getInstanceLabel({ component });
        wrapOptions.push({
          component,
          label,
          category: meta?.category,
          order: meta?.order,
        });
      }
    }

    // Test all valid HTML tags
    for (const tag of tags) {
      if (
        canWrapInstance(
          selectedItem.instance.id,
          selectedItem.instanceSelector,
          parentItem.instance.id,
          elementComponent,
          tag,
          instances,
          props,
          metas
        )
      ) {
        const label = getInstanceLabel({ component: elementComponent, tag });
        wrapOptions.push({
          component: elementComponent,
          tag,
          label,
        });
      }
    }

    return wrapOptions;
  }
);

const WrapComponentsList = () => {
  const [search, setSearch] = useState("");
  const wrapOptions = $wrapOptions.get();

  let matches = wrapOptions;
  if (search.trim().length > 0) {
    for (const word of search.trim().split(/\s+/)) {
      matches = matchSorter(matches, word, {
        keys: ["label"],
      });
    }
  }

  const goBack = () => {
    $commandContent.set(undefined);
  };

  return (
    <>
      <CommandInput
        action={{ name: "wrap", label: "Wrap" }}
        placeholder="Search components to wrap with..."
        value={search}
        onValueChange={setSearch}
        prefix={<CommandBackButton onClick={goBack} />}
        onBack={goBack}
      />
      <Flex direction="column" css={{ maxHeight: 300 }}>
        <ScrollArea>
          <CommandList>
            {matches.length === 0 ? (
              <Flex justify="center" align="center" css={{ minHeight: 100 }}>
                <Text color="subtle" align="center">
                  No components found that are allowed to wrap this instance
                </Text>
              </Flex>
            ) : (
              <CommandGroup
                name="wrap-components"
                actions={[{ name: "wrap", label: "Wrap" }]}
              >
                {matches.map(({ component, tag, label }) => {
                  const key = tag ? `${component}:${tag}` : component;
                  return (
                    <CommandItem
                      key={key}
                      value={key}
                      onSelect={() => {
                        wrapInstance(component, tag);
                        closeCommandPanel();
                      }}
                    >
                      <Flex gap={2}>
                        <CommandIcon>
                          <InstanceIcon instance={{ component, tag }} />
                        </CommandIcon>
                        <Text>{label}</Text>
                      </Flex>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </ScrollArea>
      </Flex>
      <CommandFooter />
    </>
  );
};

export const showWrapComponentsList = () => {
  openCommandPanel();
  $commandContent.set(<WrapComponentsList />);
};

export const __testing__ = {
  canWrapInstance,
};
