import { type Instance } from "@webstudio-is/sdk";
import { $createInstanceNode } from "../nodes/node-instance";
import { $createTextNode, $createParagraphNode } from "../lexical";

export const toLexicalNodes = (
  children: Instance["children"],
  InlineWrapperComponent: (props: {
    instance: Instance;
    children: string;
  }) => JSX.Element
) => {
  return children.map((child) => {
    if (typeof child === "string") {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(child));
      return paragraph;
    }

    // Inline components should always have a single child string
    const text = typeof child.children[0] === "string" ? child.children[0] : "";

    return $createInstanceNode({
      component: (
        <InlineWrapperComponent instance={child}>{text}</InlineWrapperComponent>
      ),
      text,
    });
  });
};
