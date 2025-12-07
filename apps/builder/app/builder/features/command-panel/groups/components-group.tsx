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
import {
  componentCategories,
  collectionComponent,
  elementComponent,
} from "@webstudio-is/sdk";
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
import { closeCommandPanel } from "../command-state";
import type { BaseOption } from "../shared/types";

export type ComponentOption = BaseOption & {
  type: "component";
  component: string;
  label: string;
  category: TemplateMeta["category"];
  icon: undefined | string;
  order: undefined | number;
  firstInstance: { component: string };
};

const getComponentScore = (meta: ComponentOption) => {
  const categoryScore = componentCategories.indexOf(meta.category ?? "hidden");
  const componentScore = meta.order ?? Number.MAX_SAFE_INTEGER;
  // shift category
  return categoryScore * 1000 + componentScore;
};

export const $componentOptions = computed(
  [$registeredComponentMetas, $registeredTemplates, $selectedPage],
  (metas, templates, selectedPage) => {
    const componentOptions: ComponentOption[] = [];
    for (const [name, meta] of metas) {
      const category = meta.category ?? "hidden";
      if (category === "hidden" || category === "internal") {
        continue;
      }

      // show only xml category and collection component in xml documents
      if (selectedPage?.meta.documentType === "xml") {
        if (category !== "xml" && name !== collectionComponent) {
          continue;
        }
      } else {
        // show everything except xml category in html documents
        if (category === "xml") {
          continue;
        }
      }
      const label = getInstanceLabel({ component: name }, meta);
      componentOptions.push({
        terms: ["components", label, category],
        type: "component",
        component: name,
        label,
        category,
        icon: meta.icon,
        order: meta.order,
        firstInstance: { component: name },
      });
    }
    for (const [name, meta] of templates) {
      if (meta.category === "hidden" || meta.category === "internal") {
        continue;
      }

      const componentMeta = metas.get(name);
      const label =
        meta.label ??
        componentMeta?.label ??
        getInstanceLabel({ component: name }, meta);
      componentOptions.push({
        terms: ["components", label, meta.category],
        type: "component",
        component: name,
        label,
        category: meta.category,
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
      heading={<CommandGroupHeading>Components</CommandGroupHeading>}
      actions={["add"]}
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
              <Text variant="labelsTitleCase">
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
