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
import { canConvertInstance } from "~/shared/instance-utils";
import {
  $commandContent,
  $isCommandPanelOpen,
  closeCommandPanel,
  openCommandPanel,
} from "../command-state";
import { useState } from "react";
import { convertInstance } from "~/shared/instance-utils";

type ConvertOption = {
  component: string;
  tag?: string;
  label: string;
  category?: string;
  order?: number;
};

const $convertOptions = computed(
  [
    $isCommandPanelOpen,
    $selectedInstancePath,
    $instances,
    $props,
    $registeredComponentMetas,
  ],
  (isOpen, instancePath, instances, props, metas) => {
    const convertOptions: ConvertOption[] = [];
    if (!isOpen) {
      return convertOptions;
    }
    if (instancePath === undefined || instancePath.length === 1) {
      return convertOptions;
    }
    const [selectedItem] = instancePath;

    // Test all registered components
    for (const [componentName, meta] of metas) {
      // Skip the current component
      if (componentName === selectedItem.instance.component) {
        continue;
      }

      if (
        canConvertInstance(
          selectedItem.instance.id,
          selectedItem.instanceSelector,
          componentName,
          undefined,
          instances,
          props,
          metas
        )
      ) {
        const label = getInstanceLabel({ component: componentName });
        convertOptions.push({
          component: componentName,
          label,
          category: meta?.category,
          order: meta?.order,
        });
      }
    }

    // Test all valid HTML tags (for Element component)
    for (const tag of tags) {
      if (
        canConvertInstance(
          selectedItem.instance.id,
          selectedItem.instanceSelector,
          elementComponent,
          tag,
          instances,
          props,
          metas
        )
      ) {
        const label = getInstanceLabel({ component: elementComponent, tag });
        convertOptions.push({
          component: elementComponent,
          tag,
          label,
        });
      }
    }

    return convertOptions;
  }
);

const ConvertComponentsList = () => {
  const [search, setSearch] = useState("");
  const convertOptions = $convertOptions.get();

  let matches = convertOptions;
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
        action={{ name: "convert", label: "Convert" }}
        placeholder="Search components to convert..."
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
                  No components found that this instance can be converted into
                </Text>
              </Flex>
            ) : (
              <CommandGroup
                name="convert-components"
                actions={[{ name: "convert", label: "Convert" }]}
              >
                {matches.map(({ component, tag, label }) => {
                  const key = tag ? `${component}:${tag}` : component;
                  return (
                    <CommandItem
                      key={key}
                      value={key}
                      onSelect={() => {
                        convertInstance(component, tag);
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

export const showConvertComponentsList = () => {
  openCommandPanel();
  $commandContent.set(<ConvertComponentsList />);
};
