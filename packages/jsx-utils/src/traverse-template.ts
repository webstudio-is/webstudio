import { WsEmbedTemplate } from "@webstudio-is/sdk";

type ElementType<T> = T extends (infer U)[] ? U : never;

export type NodeType = ElementType<WsEmbedTemplate>;

export const traverseTemplate = (
  template: NodeType[],
  fn: (node: NodeType, parent: NodeType | NodeType[]) => void
) => {
  template.forEach((node) => {
    fn(node, template);

    if (node.type === "instance" && node.children.length > 0) {
      traverseTemplate(node.children, (n, _) => fn(n, node));
    }
  });
};

export const traverseTemplateAsync = async (
  template: NodeType[],
  fn: (node: NodeType, parent: NodeType | NodeType[]) => Promise<void>
) => {
  for (const node of template) {
    await fn(node, template);

    if (node.type === "instance" && node.children.length > 0) {
      await traverseTemplateAsync(
        node.children,
        async (n, _) => await fn(n, node)
      );
    }
  }
};
