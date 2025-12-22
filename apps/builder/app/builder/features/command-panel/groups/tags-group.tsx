import {
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  CommandIcon,
  Flex,
  Text,
} from "@webstudio-is/design-system";
import { computed } from "nanostores";
import { elementComponent, tags } from "@webstudio-is/sdk";
import type { Instance } from "@webstudio-is/sdk";
import {
  $instances,
  $props,
  $registeredComponentMetas,
} from "~/shared/nano-states";
import { insertWebstudioFragmentAt } from "~/shared/instance-utils";
import { $selectedInstancePath } from "~/shared/awareness";
import { InstanceIcon } from "~/builder/shared/instance-label";
import { isTreeSatisfyingContentModel } from "~/shared/content-model";
import { closeCommandPanel, $isCommandPanelOpen } from "../command-state";
import type { BaseOption } from "../shared/types";

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
    $registeredComponentMetas,
  ],
  (isOpen, instancePath, instances, props, metas) => {
    const tagOptions: TagOption[] = [];
    if (!isOpen) {
      return tagOptions;
    }
    if (instancePath === undefined) {
      return tagOptions;
    }
    const [{ instance, instanceSelector }] = instancePath;
    const childInstance: Instance = {
      type: "instance",
      id: "new_instance",
      component: elementComponent,
      children: [],
    };
    const newInstances = new Map(instances);
    newInstances.set(childInstance.id, childInstance);
    newInstances.set(instance.id, {
      ...instance,
      // avoid preserving original children to not invalidate tag
      // when some descendants do not satisfy content model
      children: [{ type: "id", value: childInstance.id }],
    });
    for (const tag of tags) {
      childInstance.tag = tag;
      const isSatisfying = isTreeSatisfyingContentModel({
        instances: newInstances,
        props,
        metas,
        instanceSelector,
      });
      if (isSatisfying) {
        tagOptions.push({
          terms: ["tags", tag, `<${tag}>`],
          type: "tag",
          tag,
        });
      }
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
              insertWebstudioFragmentAt({
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
