import {
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  CommandIcon,
  Flex,
  Text,
} from "@webstudio-is/design-system";
import { computed } from "nanostores";
import { elementComponent } from "@webstudio-is/sdk";
import type { Instance } from "@webstudio-is/sdk";
import {
  $propsIndex,
  $registeredComponentMetas,
  $selectedInstancePath,
  $selectedPage,
} from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import { $props } from "~/shared/sync/data-stores";
import { insertWebstudioFragmentAt } from "~/shared/instance-utils/insert";
import { InstanceIcon } from "~/builder/shared/instance-label";
import { getValidElementChildTags } from "@webstudio-is/project-build/runtime";
import { closeCommandPanel, $isCommandPanelOpen } from "../command-state";
import type { BaseOption } from "../shared/types";
import { allowsHtmlMutations } from "../shared/document-utils";

export type TagOption = BaseOption & {
  type: "tag";
  tag: string;
};

export const $tagOptions = computed(
  [
    $isCommandPanelOpen,
    $selectedInstancePath,
    $instances,
    $props,
    $propsIndex,
    $registeredComponentMetas,
    $selectedPage,
  ],
  (
    isCommandPanelOpen,
    instancePath,
    instances,
    props,
    propsIndex,
    metas,
    selectedPage
  ) => {
    const tagOptions: TagOption[] = [];
    if (isCommandPanelOpen === false) {
      return tagOptions;
    }
    if (instancePath === undefined) {
      return tagOptions;
    }
    if (!allowsHtmlMutations(selectedPage)) {
      return tagOptions;
    }
    const [{ instance, instanceSelector }] = instancePath;
    for (const tag of getValidElementChildTags({
      parentInstanceId: instance.id,
      parentInstanceSelector: instanceSelector,
      instances,
      props,
      metas,
      htmlTagsByInstanceId: propsIndex.htmlTagsByInstanceId,
    })) {
      tagOptions.push({
        terms: ["tags", tag, `<${tag}>`],
        type: "tag",
        tag,
      });
    }
    return tagOptions;
  }
);

export const TagsGroup = ({ options }: { options: TagOption[] }) => {
  return (
    <CommandGroup
      name="tag"
      heading={
        <CommandGroupHeading>Tags ({options.length})</CommandGroupHeading>
      }
      actions={[{ name: "add", label: "Add" }]}
    >
      {options.map(({ tag }) => {
        return (
          <CommandItem
            key={tag}
            // preserve selected state when rerender
            value={tag}
            onSelect={() => {
              closeCommandPanel();
              const newInstance: Instance = {
                type: "instance",
                id: "new_instance",
                component: elementComponent,
                tag,
                children: [],
              };
              void insertWebstudioFragmentAt({
                children: [{ type: "id", value: newInstance.id }],
                instances: [newInstance],
                props: [],
                dataSources: [],
                styleSourceSelections: [],
                styleSources: [],
                styles: [],
                breakpoints: [],
                assets: [],
                resources: [],
              });
            }}
          >
            <Flex gap={2}>
              <CommandIcon>
                <InstanceIcon instance={{ component: elementComponent, tag }} />
              </CommandIcon>
              <Text>{`<${tag}>`}</Text>
            </Flex>
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
};
