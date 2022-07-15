import { useState, useMemo } from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { type Instance } from "@webstudio-is/react-sdk";
import { Tree } from "./tree";
import { getInstancePath } from "~/shared/tree-utils";

export default {
  component: Tree,
} as ComponentMeta<typeof Tree>;

const box = (children: Array<Instance>): Instance => {
  return {
    id: Math.random().toString(),
    component: "Box",
    children: children,
    cssRules: [],
  };
};

const heading = (children: Array<Instance>): Instance => {
  return {
    id: Math.random().toString(),
    component: "Heading",
    children: children,
    cssRules: [],
  };
};

const paragraph = (children: Array<Instance>): Instance => {
  return {
    id: Math.random().toString(),
    component: "Paragraph",
    children: children,
    cssRules: [],
  };
};

const tree = box([
  box([heading([]), paragraph([])]),
  box([heading([]), paragraph([]), paragraph([])]),
]);

export const Test: ComponentStory<typeof Tree> = () => {
  const [selectedId, setSelectedId] = useState(tree.id);

  const selectedPath = useMemo(
    () => getInstancePath(tree, selectedId),
    [selectedId]
  );

  return (
    <Tree
      instance={tree}
      selectedInstanceId={selectedId}
      selectedInstancePath={selectedPath}
      level={0}
      onSelect={(instance) => setSelectedId(instance.id)}
      animate={true}
    />
  );
};
