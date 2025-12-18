import {
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  Text,
} from "@webstudio-is/design-system";
import { computed } from "nanostores";
import { parseComponentName } from "@webstudio-is/sdk";
import type { Instance } from "@webstudio-is/sdk";
import { $instances, $pages } from "~/shared/sync/data-stores";
import { getInstanceLabel } from "~/builder/shared/instance-label";
import { $awareness, findAwarenessByInstanceId } from "~/shared/awareness";
import { closeCommandPanel, $isCommandPanelOpen } from "../command-state";
import type { BaseOption } from "../shared/types";
import { setActiveSidebarPanel } from "~/builder/shared/nano-states";
import { humanizeString } from "~/shared/string-utils";

export type InstanceOption = BaseOption & {
  type: "instance";
  instance: Instance;
};

export const $instanceOptions = computed(
  [$isCommandPanelOpen, $instances, $pages],
  (isOpen, instances, pages) => {
    if (!isOpen || !pages) {
      return [];
    }
    const instanceOptions: InstanceOption[] = [];
    for (const instance of instances.values()) {
      const label = getInstanceLabel(instance);
      // Include instance label and component name in search terms
      instanceOptions.push({
        terms: ["instances", label, instance.component],
        type: "instance",
        instance,
      });
    }
    return instanceOptions;
  }
);

export const InstancesGroup = ({ options }: { options: InstanceOption[] }) => {
  return (
    <CommandGroup
      name="instance"
      heading={<CommandGroupHeading>Instances</CommandGroupHeading>}
      actions={["select"]}
    >
      {options.map(({ instance }) => {
        const label = getInstanceLabel(instance);
        const [_namespace, componentName] = parseComponentName(
          instance.component
        );
        const componentLabel = humanizeString(componentName);
        return (
          <CommandItem
            key={instance.id}
            value={instance.id}
            onSelect={() => {
              closeCommandPanel();
              const pages = $pages.get();
              const instances = $instances.get();
              if (pages && instances) {
                const awareness = findAwarenessByInstanceId(
                  pages,
                  instances,
                  instance.id
                );
                if (awareness) {
                  $awareness.set(awareness);
                  setActiveSidebarPanel("auto");
                }
              }
            }}
          >
            <Text variant="labelsTitleCase">{label}</Text>
            <Text color="moreSubtle" truncate css={{ maxWidth: "30ch" }}>
              {componentLabel}
            </Text>
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
};
