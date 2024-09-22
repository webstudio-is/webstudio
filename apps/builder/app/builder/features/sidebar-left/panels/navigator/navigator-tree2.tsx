import { useStore } from "@nanostores/react";
import {
  ScrollArea,
  SmallIconButton,
  Text,
  Tooltip,
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import { atom, computed } from "nanostores";
import {
  $hoveredInstanceSelector,
  $instances,
  $props,
  $propsIndex,
  $propValuesByInstanceSelector,
  $selectedInstanceSelector,
  $selectedPage,
} from "~/shared/nano-states";
import type { InstanceSelector } from "~/shared/tree-utils";
import { TreeNode, TreeRoot } from "./tree";
import { EyeconClosedIcon, EyeconOpenIcon } from "@webstudio-is/icons";
import { serverSyncStore } from "~/shared/sync";
import { showAttribute } from "@webstudio-is/react-sdk";
import { nanoid } from "nanoid";

type TreeItem = {
  level: number;
  selector: InstanceSelector;
  instance: Instance;
  isExpanded: undefined | boolean;
};

const $expandedItems = atom(new Set<string>());

const $flatTree = computed(
  [$selectedPage, $instances, $expandedItems],
  (page, instances, expandedItems) => {
    const flatTree: TreeItem[] = [];
    if (page === undefined) {
      return flatTree;
    }
    const traverse = (
      instanceId: Instance["id"],
      selector: InstanceSelector,
      level = 0
    ) => {
      const instance = instances.get(instanceId);
      if (instance === undefined) {
        return;
      }
      let isExpanded: undefined | boolean;
      if (level > 0 && instance.children.some((child) => child.type === "id")) {
        isExpanded = expandedItems.has(selector.join());
      }
      flatTree.push({ level, instance, selector, isExpanded });
      if (level === 0 || isExpanded) {
        for (const child of instance.children) {
          if (child.type === "id") {
            traverse(child.value, [child.value, ...selector], level + 1);
          }
        }
      }
    };
    traverse(page.rootInstanceId, [page.rootInstanceId]);
    return flatTree;
  }
);

const handleExpand = (item: TreeItem, isExpanded: boolean, all: boolean) => {
  const expandedItems = new Set($expandedItems.get());
  const instances = $instances.get();
  const traverse = (instanceId: Instance["id"], selector: InstanceSelector) => {
    const key = selector.join();
    if (isExpanded) {
      expandedItems.add(key);
    } else {
      expandedItems.delete(key);
    }
    const instance = instances.get(instanceId);
    // expand all descendents as well when alt is pressed
    if (all && instance) {
      for (const child of instance.children) {
        traverse(child.value, [child.value, ...selector]);
      }
    }
  };
  traverse(item.instance.id, item.selector);
  $expandedItems.set(expandedItems);
};

const ShowToggle = ({
  instanceId,
  value,
}: {
  instanceId: Instance["id"];
  value: boolean;
}) => {
  const toggleShow = () => {
    const newValue = value === false;
    serverSyncStore.createTransaction([$props], (props) => {
      const { propsByInstanceId } = $propsIndex.get();
      const instanceProps = propsByInstanceId.get(instanceId);
      let showProp = instanceProps?.find((prop) => prop.name === showAttribute);
      if (showProp === undefined) {
        showProp = {
          id: nanoid(),
          instanceId,
          name: showAttribute,
          type: "boolean",
          value: newValue,
        };
      }
      if (showProp.type === "boolean") {
        props.set(showProp.id, { ...showProp, value: newValue });
      }
    });
  };
  return (
    <Tooltip
      // If you are changing it, change the other one too
      content="Removes the instance from the DOM. Breakpoints have no effect on this setting."
      disableHoverableContent
      variant="wrapped"
    >
      <SmallIconButton
        tabIndex={-1}
        aria-label="Show"
        onClick={toggleShow}
        icon={value ? <EyeconOpenIcon /> : <EyeconClosedIcon />}
      />
    </Tooltip>
  );
};

export const NavigatorTree2 = () => {
  const flatTree = useStore($flatTree);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const selectedKey = selectedInstanceSelector?.join();
  const hoveredInstanceSelector = useStore($hoveredInstanceSelector);
  const hoveredKey = hoveredInstanceSelector?.join();
  const propValues = useStore($propValuesByInstanceSelector);

  return (
    <ScrollArea
      direction="both"
      css={{
        width: "100%",
        overflow: "hidden",
        flexBasis: 0,
        flexGrow: 1,
      }}
    >
      <TreeRoot>
        {flatTree.map((item, index) => {
          const key = item.selector.join();
          const props = propValues.get(JSON.stringify(item.selector));
          const show = Boolean(props?.get(showAttribute) ?? true);
          return (
            <TreeNode
              key={index}
              level={item.level}
              isSelected={selectedKey === key}
              isHighlighted={hoveredKey === key}
              isExpanded={item.isExpanded}
              onExpand={(isExpanded, all) =>
                handleExpand(item, isExpanded, all)
              }
              nodeProps={{}}
              buttonProps={{
                onMouseEnter: () => $hoveredInstanceSelector.set(item.selector),
                onMouseLeave: () => $hoveredInstanceSelector.set(undefined),
                onClick: () => $selectedInstanceSelector.set(item.selector),
                onFocus: () => $selectedInstanceSelector.set(item.selector),
              }}
              action={<ShowToggle instanceId={item.instance.id} value={show} />}
            >
              <Text truncate>
                {item.instance.component} hello world eveything i'm shuffling
              </Text>
            </TreeNode>
          );
        })}
      </TreeRoot>
    </ScrollArea>
  );
};
