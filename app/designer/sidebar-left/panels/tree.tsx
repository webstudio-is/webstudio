import { useState, useMemo } from "react";
import { type Instance } from "@webstudio-is/sdk";
import { ListNestedIcon } from "~/shared/icons";
import {
  Flex,
  Text,
  Collapsible,
  Button,
  keyframes,
  styled,
} from "~/shared/design-system";
import { TriangleRightIcon, TriangleDownIcon } from "~/shared/icons";
import { primitives, type SelectedInstanceData } from "~/shared/component";
import { type Publish } from "~/designer/iframe";

const openKeyframes = keyframes({
  from: { height: 0 },
  to: { height: "var(--radix-collapsible-content-height)" },
});

const closeKeyframes = keyframes({
  from: { height: "var(--radix-collapsible-content-height)" },
  to: { height: 0 },
});

const CollapsibleContent = styled(Collapsible.Content, {
  overflow: "hidden",
  '&[data-state="open"]': {
    animation: `${openKeyframes} 150ms ease-in-out`,
  },
  '&[data-state="closed"]': {
    animation: `${closeKeyframes} 150ms ease-in-out`,
  },
});

type TreeProps = {
  instance: Instance;
  selectedInstanceId?: Instance["id"];
  level?: number;
  onSelect: (instance: Instance) => void;
};

const Tree = ({
  instance,
  selectedInstanceId,
  level = 0,
  onSelect,
}: TreeProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Text nodes have only one child which is a string.
  const showChildren =
    instance.children.length > 1 || typeof instance.children[0] === "object";

  const children = useMemo(() => {
    if (isOpen === false || showChildren === false) {
      return null;
    }
    const children = [];
    for (const child of instance.children) {
      if (typeof child === "string") continue;
      children.push(
        <Tree
          instance={child}
          selectedInstanceId={selectedInstanceId}
          level={level + 1}
          key={child.id}
          onSelect={onSelect}
        />
      );
    }
    return children;
  }, [instance, level, isOpen, selectedInstanceId]);

  const { Icon, label } = primitives[instance.component];

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <Flex
        css={{
          // @todo don't hardcode the padding
          paddingLeft: level * 15 + (showChildren ? 0 : 15),
          color: "$hiContrast",
          alignItems: "center",
        }}
      >
        {showChildren && (
          <Collapsible.Trigger asChild>
            {isOpen ? <TriangleDownIcon /> : <TriangleRightIcon />}
          </Collapsible.Trigger>
        )}
        <Button
          {...(instance.id === selectedInstanceId
            ? { state: "active" }
            : { ghost: true })}
          css={{ display: "flex", gap: "$1", padding: "$1" }}
          onFocus={() => {
            onSelect(instance);
          }}
        >
          <Icon />
          <Text>{label}</Text>
        </Button>
      </Flex>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible.Root>
  );
};

type TabContentProps = {
  rootInstance?: Instance;
  publish: Publish;
  selectedInstanceData?: SelectedInstanceData;
};

export const TabContent = ({
  rootInstance,
  publish,
  selectedInstanceData,
}: TabContentProps) => {
  if (rootInstance === undefined) return null;

  return (
    <Flex gap="3" direction="column" css={{ padding: "$1" }}>
      <Tree
        instance={rootInstance}
        selectedInstanceId={selectedInstanceData?.id}
        onSelect={(instance) => {
          publish<"focusElement", Instance["id"]>({
            type: "focusElement",
            payload: instance.id,
          });
        }}
      />
    </Flex>
  );
};

export const icon = <ListNestedIcon />;
