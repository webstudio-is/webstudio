import {
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  CommandIcon,
  Flex,
  Text,
} from "@webstudio-is/design-system";
import { computed } from "nanostores";
import type { TemplateMeta } from "@webstudio-is/template";
import { collectionComponent, elementComponent } from "@webstudio-is/sdk";
import {
  $registeredComponentMetas,
  $registeredTemplates,
} from "~/shared/nano-states";
import {
  getComponentTemplateData,
  insertWebstudioElementAt,
  insertWebstudioFragmentAt,
} from "~/shared/instance-utils";
import { humanizeString } from "~/shared/string-utils";
import { $selectedPage } from "~/shared/awareness";
import {
  getInstanceLabel,
  InstanceIcon,
} from "~/builder/shared/instance-label";
import { closeCommandPanel, $isCommandPanelOpen } from "../command-state";
import type { BaseOption } from "../shared/types";
import {
  shouldFilterCategory,
  getComponentScore,
} from "../shared/component-utils";

export type ComponentOption = BaseOption & {
  type: "component";
  component: string;
  label: string;
  category: TemplateMeta["category"];
  icon: undefined | string;
  order: undefined | number;
  firstInstance: { component: string };
};

export const $componentOptions = computed(
  [
    $isCommandPanelOpen,
    $registeredComponentMetas,
    $registeredTemplates,
    $selectedPage,
  ],
  (isOpen, metas, templates, selectedPage) => {
    const componentOptions: ComponentOption[] = [];
    if (!isOpen) {
      return componentOptions;
    }

    const addComponentOption = ({
      name,
      category,
      label,
      icon,
      order,
      firstInstance,
    }: {
      name: string;
      category: TemplateMeta["category"];
      label: string;
      icon?: string;
      order?: number;
      firstInstance: { component: string };
    }) => {
      // show only xml category and collection component in xml documents
      if (selectedPage?.meta.documentType === "xml") {
        if (category !== "xml" && name !== collectionComponent) {
          return;
        }
      } else {
        // show everything except xml category in html documents
        if (category === "xml") {
          return;
        }
      }

      componentOptions.push({
        terms: ["components", label, category],
        type: "component",
        component: name,
        label,
        category,
        icon,
        order,
        firstInstance,
      });
    };

    for (const [name, meta] of metas) {
      if (shouldFilterCategory(meta.category)) {
        continue;
      }
      const category = meta.category ?? "hidden";
      const label = meta.label ?? getInstanceLabel({ component: name });

      addComponentOption({
        name,
        category,
        label,
        icon: meta.icon,
        order: meta.order,
        firstInstance: { component: name },
      });
    }

    for (const [name, meta] of templates) {
      if (shouldFilterCategory(meta.category)) {
        continue;
      }

      const componentMeta = metas.get(name);
      const label =
        meta.label ??
        componentMeta?.label ??
        getInstanceLabel({ component: name });

      addComponentOption({
        name,
        category: meta.category,
        label,
        icon: meta.icon ?? componentMeta?.icon,
        order: meta.order,
        firstInstance: meta.template.instances[0],
      });
    }

    componentOptions.sort(
      (leftOption, rightOption) =>
        getComponentScore(leftOption) - getComponentScore(rightOption)
    );
    return componentOptions;
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
      {options.map(({ component, label, category, icon, firstInstance }) => {
        return (
          <CommandItem
            key={component}
            // preserve selected state when rerender
            value={component}
            onSelect={() => {
              closeCommandPanel();
              if (component === elementComponent) {
                insertWebstudioElementAt();
              } else {
                const fragment = getComponentTemplateData(component);
                if (fragment) {
                  insertWebstudioFragmentAt(fragment);
                }
              }
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
      })}
    </CommandGroup>
  );
};
