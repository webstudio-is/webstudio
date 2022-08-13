import { useState, useMemo, useEffect } from "react";
import { type Instance, components } from "@webstudio-is/react-sdk";
import {
  Flex,
  Text,
  Collapsible,
  Button,
  keyframes,
  styled,
} from "@webstudio-is/design-system";
import { TriangleRightIcon, TriangleDownIcon } from "@webstudio-is/icons";
import noop from "lodash.noop";

const openKeyframes = keyframes({
  from: { height: 0 },
  to: { height: "var(--radix-collapsible-content-height)" },
});

const closeKeyframes = keyframes({
  from: { height: "var(--radix-collapsible-content-height)" },
  to: { height: 0 },
});

const CollapsibleContentAnimated = styled(Collapsible.Content, {
  overflow: "hidden",
  '&[data-state="open"]': {
    animation: `${openKeyframes} 150ms ease-in-out`,
  },
  '&[data-state="closed"]': {
    animation: `${closeKeyframes} 150ms ease-in-out`,
  },
});

const CollapsibleContentUnanimated = styled(Collapsible.Content, {
  overflow: "hidden",
});

type TreeProps = {
  instance: Instance;
  selectedInstanceId?: Instance["id"];
  selectedInstancePath: Array<Instance>;
  level?: number;
  onSelect?: (instance: Instance) => void;
  animate?: boolean;
};

export const Tree = ({
  instance,
  selectedInstanceId,
  selectedInstancePath,
  level = 0,
  onSelect = noop,
  animate = true,
}: TreeProps) => {
  const [isOpen, setIsOpen] = useState(selectedInstancePath.includes(instance));

  useEffect(() => {
    setIsOpen(selectedInstancePath.includes(instance));
  }, [selectedInstancePath, instance]);

  // Text nodes have only one child which is a string.
  const showChildren =
    instance.children.length > 1 || typeof instance.children[0] === "object";

  const children = useMemo(() => {
    if ((isOpen === false && animate === false) || showChildren === false) {
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
          animate={animate}
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
    animate,
  ]);

  const { Icon, label } = components[instance.component];
  const CollapsibleContent = animate
    ? CollapsibleContentAnimated
    : CollapsibleContentUnanimated;

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
          <Text size="1">{label}</Text>
        </Button>
      </Flex>
      {children != null && <CollapsibleContent>{children}</CollapsibleContent>}
    </Collapsible.Root>
  );
};
