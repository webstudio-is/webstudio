import {
  CommandGroup,
  CommandGroupFooter,
  CommandGroupHeading,
  CommandIcon,
  CommandInput,
  CommandItem,
  CommandList,
  Flex,
  ScrollArea,
  Text,
} from "@webstudio-is/design-system";
import { matchSorter } from "match-sorter";
import { computed } from "nanostores";
import { componentCategories, elementComponent, tags } from "@webstudio-is/sdk";
import type { Instance } from "@webstudio-is/sdk";
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
import { $commandContent, closeCommandPanel } from "../command-state";
import { useState } from "react";
import { BackButton } from "../shared/back-button";
import { humanizeString } from "~/shared/string-utils";
import { mapGroupBy } from "~/shared/shim";
import { wrapIn } from "~/shared/instance-utils";

type WrapOption = {
  component: string;
  tag?: string;
  label: string;
  category?: string;
  order?: number;
};

const $wrapOptions = computed(
  [$selectedInstancePath, $instances, $props, $registeredComponentMetas],
  (instancePath, instances, props, metas) => {
    const wrapOptions: WrapOption[] = [];
    if (instancePath === undefined || instancePath.length === 1) {
      return wrapOptions;
    }
    const [selectedItem, parentItem] = instancePath;

    // Helper to test if wrapping with a component/tag is valid
    const testWrap = (component: string, tag?: string): boolean => {
      const wrapperInstance: Instance = {
        type: "instance",
        id: "wrapper_instance",
        component,
        children: [{ type: "id", value: selectedItem.instance.id }],
      };
      if (tag || component === elementComponent) {
        wrapperInstance.tag = tag ?? "div";
      }

      const newInstances = new Map(instances);
      newInstances.set(wrapperInstance.id, wrapperInstance);

      // Update parent to point to wrapper
      const parentInstance = instances.get(parentItem.instance.id);
      if (parentInstance) {
        const newParentInstance = { ...parentInstance };
        newParentInstance.children = parentInstance.children.map((child) => {
          if (child.type === "id" && child.value === selectedItem.instance.id) {
            return { type: "id", value: wrapperInstance.id };
          }
          return child;
        });
        newInstances.set(parentInstance.id, newParentInstance);
      }

      return isTreeSatisfyingContentModel({
        instances: newInstances,
        props,
        metas,
        instanceSelector: [wrapperInstance.id, ...parentItem.instanceSelector],
      });
    };

    // Test all registered components that can accept children
    for (const [component, meta] of metas) {
      // Skip components that don't accept instance children
      const contentModel = meta?.contentModel;
      const acceptsInstanceChildren =
        !contentModel || // defaults to accepting instances
        (contentModel.children.includes("instance") &&
          contentModel.category === "instance");

      if (acceptsInstanceChildren && testWrap(component)) {
        const label = getInstanceLabel({ component });
        wrapOptions.push({
          component,
          label,
          category: meta?.category ?? "hidden",
          order: meta?.order,
        });
      }
    }

    // Test all valid HTML tags
    for (const tag of tags) {
      if (testWrap(elementComponent, tag)) {
        const label = getInstanceLabel({ component: elementComponent, tag });
        wrapOptions.push({
          component: elementComponent,
          tag,
          label,
        });
      }
    }

    // Sort using the same logic as components panel
    wrapOptions.sort((left, right) => {
      // Non-element components use category and order scoring
      if (
        left.component !== elementComponent &&
        right.component !== elementComponent
      ) {
        const leftCategory = (left.category ??
          "hidden") as (typeof componentCategories)[number];
        const rightCategory = (right.category ??
          "hidden") as (typeof componentCategories)[number];
        const leftCategoryScore = componentCategories.indexOf(leftCategory);
        const rightCategoryScore = componentCategories.indexOf(rightCategory);
        const leftComponentScore = left.order ?? Number.MAX_SAFE_INTEGER;
        const rightComponentScore = right.order ?? Number.MAX_SAFE_INTEGER;
        const leftScore = leftCategoryScore * 1000 + leftComponentScore;
        const rightScore = rightCategoryScore * 1000 + rightComponentScore;
        return leftScore - rightScore;
      }
      // Elements come after non-element components
      if (
        left.component === elementComponent &&
        right.component !== elementComponent
      ) {
        return 1;
      }
      if (
        left.component !== elementComponent &&
        right.component === elementComponent
      ) {
        return -1;
      }
      // Both are elements, maintain order (already sorted by tags array)
      return 0;
    });

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

  // Group by category
  const groupedOptions = mapGroupBy(matches, (option) => {
    if (option.component === elementComponent) {
      return "elements";
    }
    return option.category ?? "other";
  });

  return (
    <>
      <CommandInput
        action="wrap"
        placeholder="Search components to wrap with..."
        value={search}
        onValueChange={setSearch}
        onKeyDown={(event) => {
          if (event.key === "Backspace" && search === "") {
            event.preventDefault();
            $commandContent.set(undefined);
          }
        }}
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
              Array.from(groupedOptions.entries()).map(
                ([category, options]) => (
                  <CommandGroup
                    key={category}
                    name={`wrap-${category}`}
                    heading={
                      <CommandGroupHeading>
                        {category === "elements"
                          ? "Elements"
                          : humanizeString(category)}
                      </CommandGroupHeading>
                    }
                    actions={["wrap"]}
                  >
                    {options.map(({ component, tag, label }) => {
                      const key = tag ? `${component}:${tag}` : component;
                      return (
                        <CommandItem
                          key={key}
                          value={key}
                          onSelect={() => {
                            wrapIn(component, tag);
                            closeCommandPanel();
                          }}
                        >
                          <Flex gap={2}>
                            <CommandIcon>
                              <InstanceIcon instance={{ component, tag }} />
                            </CommandIcon>
                            <Text variant="labelsSentenceCase">{label}</Text>
                          </Flex>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )
              )
            )}
          </CommandList>
        </ScrollArea>
      </Flex>
      <CommandGroupFooter>
        <Flex grow>
          <BackButton />
        </Flex>
      </CommandGroupFooter>
    </>
  );
};

export const showWrapComponentsList = () => {
  $commandContent.set(<WrapComponentsList />);
};
