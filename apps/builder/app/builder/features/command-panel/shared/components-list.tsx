import { useState } from "react";
import { matchSorter } from "match-sorter";
import {
  CommandGroup,
  CommandGroupFooter,
  CommandInput,
  CommandItem,
  CommandList,
  CommandIcon,
  Flex,
  ScrollArea,
  Text,
  useSelectedAction,
} from "@webstudio-is/design-system";
import { elementComponent } from "@webstudio-is/sdk";
import {
  $registeredComponentMetas,
  $registeredTemplates,
} from "~/shared/nano-states";
import {
  getComponentTemplateData,
  insertWebstudioElementAt,
  insertWebstudioFragmentAt,
} from "~/shared/instance-utils";
import {
  getInstanceLabel,
  InstanceIcon,
} from "~/builder/shared/instance-label";
import { humanizeString } from "~/shared/string-utils";
import { $commandContent, closeCommandPanel } from "../command-state";
import { BackButton } from "./back-button";

export type ComponentOption = {
  component: string;
  label: string;
  category: string;
  icon?: string;
  firstInstance: { component: string; tag?: string };
};

type ComponentsListProps = {
  components: Set<string>;
  onSelect: (component: string, action: string) => void;
  actions?: string[];
  defaultAction?: string;
};

export const ComponentsList = ({
  components,
  onSelect,
  actions = ["select"],
  defaultAction = "select",
}: ComponentsListProps) => {
  const metas = $registeredComponentMetas.get();
  const templates = $registeredTemplates.get();

  const componentOptions: ComponentOption[] = [];
  for (const component of components) {
    const meta = metas.get(component);
    const template = templates.get(component);

    const category = meta?.category ?? "hidden";
    if (category === "hidden" || category === "internal") {
      continue;
    }

    const label = getInstanceLabel({ component });
    const icon = template?.icon ?? meta?.icon;
    const firstInstance = template?.template.instances[0] ?? {
      component,
      tag: meta?.presetStyle ? Object.keys(meta.presetStyle)[0] : undefined,
    };

    componentOptions.push({
      component,
      label,
      category,
      icon,
      firstInstance,
    });
  }

  const [search, setSearch] = useState("");
  const action = useSelectedAction();

  const goBack = () => {
    $commandContent.set(undefined);
  };

  let matches = componentOptions;
  // prevent searching when value is empty
  // to preserve original items order
  if (search.trim().length > 0) {
    for (const word of search.trim().split(/\s+/)) {
      matches = matchSorter(matches, word, {
        keys: ["label", "category"],
      });
    }
  }

  return (
    <>
      <CommandInput
        action={defaultAction}
        placeholder="Search components..."
        value={search}
        onValueChange={setSearch}
        onKeyDown={(event) => {
          if (event.key === "Backspace" && search === "") {
            event.preventDefault();
            goBack();
          }
        }}
      />
      <Flex direction="column" css={{ maxHeight: 300 }}>
        <ScrollArea>
          <CommandList>
            <CommandGroup name="component" actions={actions}>
              {matches.length === 0 ? (
                <Flex justify="center" align="center" css={{ minHeight: 100 }}>
                  <Text color="subtle">No components found</Text>
                </Flex>
              ) : (
                matches.map(
                  ({ component, label, category, icon, firstInstance }) => (
                    <CommandItem
                      key={component}
                      value={component}
                      onSelect={() => {
                        onSelect(component, action);
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
                  )
                )
              )}
            </CommandGroup>
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

export const insertComponent = (component: string) => {
  closeCommandPanel();
  if (component === elementComponent) {
    insertWebstudioElementAt();
  } else {
    const fragment = getComponentTemplateData(component);
    if (fragment) {
      insertWebstudioFragmentAt(fragment);
    }
  }
};
