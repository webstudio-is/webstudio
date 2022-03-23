import { useState, useMemo } from "react";
import { type Instance } from "@webstudio-is/sdk";
import {
  Flex,
  Text,
  Collapsible,
  Button,
  keyframes,
  styled,
} from "~/shared/design-system";
import { TriangleRightIcon, TriangleDownIcon } from "~/shared/icons";
import { primitives } from "~/shared/component";

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
  selectedInstancePath: Array<Instance>;
  level?: number;
  onSelect: (instance: Instance) => void;
};

export const Tree = ({
  instance,
  selectedInstanceId,
  level = 0,
  onSelect,
  selectedInstancePath,
}: TreeProps) => {
  const [isOpen, setIsOpen] = useState(selectedInstancePath.includes(instance));

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
          selectedInstancePath={selectedInstancePath}
          level={level + 1}
          key={child.id}
          onSelect={onSelect}
        />
      );
    }
    return children;
  }, [
    instance,
    level,
    isOpen,
    selectedInstanceId,
    selectedInstancePath,
    onSelect,
    showChildren,
  ]);

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
