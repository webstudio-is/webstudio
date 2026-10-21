import { insertWebstudioComponentAt } from "~/shared/instance-utils/insert";
import {
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  CommandIcon,
  Flex,
  Text,
} from "@webstudio-is/design-system";
import { computed } from "nanostores";
import {
  flattenBuilderComponentPanelItems,
  listBuilderComponentPanelItems,
  type BuilderComponentPanelItem,
} from "@webstudio-is/project-build/runtime";
import {
  $registeredComponentMetas,
  $registeredTemplates,
} from "~/shared/nano-states";
import { humanizeString } from "~/shared/string-utils";
import { $selectedPage } from "~/shared/nano-states";
import {
  getInstanceLabel,
  InstanceIcon,
} from "~/builder/shared/instance-label";
import { closeCommandPanel, $isCommandPanelOpen } from "../command-state";
import type { BaseOption } from "../shared/types";

export type ComponentOption = BaseOption & {
  type: "component";
  component: string;
  catalogId: string;
} & BuilderComponentPanelItem;

export const $componentOptions = computed(
  [
    $isCommandPanelOpen,
    $registeredComponentMetas,
    $registeredTemplates,
    $selectedPage,
  ],
  (isOpen, metas, templates, selectedPage) => {
    if (!isOpen) {
      return [];
    }
    if (selectedPage?.meta.documentType === "text") {
      return [];
    }
    const itemsByCategory = listBuilderComponentPanelItems({
      metas,
      templates,
      documentType: selectedPage?.meta.documentType ?? "html",
      getFallbackLabel: (component) => getInstanceLabel({ component }),
      getTemplateIcon: (_component, template, meta) =>
        template.icon ?? meta?.icon,
    });
    return flattenBuilderComponentPanelItems(itemsByCategory).map(
      (item, index): ComponentOption => ({
        ...item,
        catalogId: `${item.name}:${index}`,
        terms: ["components", item.label, item.category],
        type: "component",
        component: item.name,
      })
    );
  }
);

export const ComponentsGroup = ({
  options,
}: {
  options: ComponentOption[];
}) => {
  return (
    <CommandGroup
      name="component"
      heading={
        <CommandGroupHeading>Components ({options.length})</CommandGroupHeading>
      }
      actions={[{ name: "add", label: "Add" }]}
    >
      {options.map(
        ({ catalogId, component, label, category, icon, firstInstance }) => {
          return (
            <CommandItem
              key={catalogId}
              // preserve selected state when rerender
              value={catalogId}
              onSelect={() => {
                closeCommandPanel();
                void insertWebstudioComponentAt(component);
              }}
            >
              <Flex gap={2}>
                <CommandIcon>
                  <InstanceIcon instance={firstInstance} icon={icon} />
                </CommandIcon>
                <Text>
                  {label}{" "}
                  <Text as="span" color="moreSubtle">
                    {humanizeString(category)}
                  </Text>
                </Text>
              </Flex>
            </CommandItem>
          );
        }
      )}
    </CommandGroup>
  );
};
