import { nanoid } from "nanoid";
import type { Instance, Prop, WebstudioFragment } from "@webstudio-is/sdk";
import type { WfElementNode, WfNode } from "./schema";

const mapComponentAndProperties = (
  wfNode: WfElementNode,
  instanceId: Instance["id"]
) => {
  const props: Array<Prop> = [];
  const component = wfNode.type;

  switch (component) {
    case "Heading":
    case "List":
    case "ListItem":
    case "Paragraph":
    case "Superscript":
    case "Subscript":
    case "Blockquote": {
      return { component, props };
    }
    case "Block": {
      const component = wfNode.data?.text ? "Text" : "Box";
      return { component, props };
    }
    case "Link": {
      const data = wfNode.data;

      if (data.link.url) {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "href",
          value: data.link.url,
        });
      }
      if (data.link.target) {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "target",
          value: data.link.target,
        });
      }
      return { component, props };
    }
    case "Section": {
      const component = "Box";
      return { component, props };
    }
    case "RichText": {
      const component = "Box";
      return { component, props };
    }
    case "Strong": {
      const component = "Bold";
      return { component, props };
    }
    case "Emphasized": {
      const component = "Italic";
      return { component, props };
    }
    case "BlockContainer": {
      const component = "Box";
      return { component, props };
    }
    case "Layout": {
      const component = "Box";
      return { component, props };
    }
    case "Cell": {
      const component = "Box";
      return { component, props };
    }
    case "VFlex": {
      const component = "Box";
      return { component, props };
    }
    case "HFlex": {
      const component = "Box";
      return { component, props };
    }
    case "Grid": {
      const component = "Box";
      return { component, props };
    }
    case "Row": {
      const component = "Box";
      return { component, props };
    }
    case "Column": {
      const component = "Box";
      return { component, props };
    }
    case "CodeBlock": {
      const component = "CodeText";
      const data = wfNode.data;

      if (data.language) {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "lang",
          value: data.language,
        });
      }

      if (data.code) {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "code",
          value: data.code,
        });
      }
      return { component, props };
    }
    case "HtmlEmbed": {
      props.push({
        type: "string",
        id: nanoid(),
        instanceId,
        name: "code",
        value: wfNode.v,
      });
      props.push({
        type: "boolean",
        id: nanoid(),
        instanceId,
        name: "clientOnly",
        value: true,
      });

      return { component, props };
    }
    case "Image": {
      const data = wfNode.data;

      if (
        data.attr.alt &&
        // This is how they tell it when alt comes from image meta during publishing
        data.attr.alt !== "__wf_reserved_inherit" &&
        // This is how they tell it to use alt="", which is our default anyways
        data.attr.alt !== "__wf_reserved_decorative"
      ) {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "alt",
          value: data.attr.alt,
        });
      }

      if (data.attr.loading === "eager" || data.attr.loading === "lazy") {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "loading",
          value: data.attr.loading,
        });
      }

      if (data.attr.width && data.attr.width !== "auto") {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "width",
          value: data.attr.width,
        });
      }

      if (data.attr.height && data.attr.height !== "auto") {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "height",
          value: data.attr.height,
        });
      }
      if (data.attr.src) {
        props.push({
          type: "string",
          id: nanoid(),
          instanceId,
          name: "src",
          value: data.attr.src,
        });
      }
      return { component, props };
    }
  }

  component satisfies never;
};

const addAttributes = (
  wfNode: WfElementNode,
  instanceId: Instance["id"],
  props: Array<Prop>
) => {
  if ("tag" in wfNode) {
    props.push({
      type: "string",
      id: nanoid(),
      instanceId,
      name: "tag",
      value: wfNode.tag,
    });
  }

  if (wfNode.data?.xattr) {
    for (const attribute of wfNode.data.xattr) {
      props.push({
        type: "string",
        id: nanoid(),
        instanceId,
        name: attribute.name,
        value: attribute.value,
      });
    }
  }
};

export const addInstanceAndProperties = (
  wfNode: WfNode,
  added: Map<WfNode["_id"], Instance["id"]>,
  wfNodes: Map<WfNode["_id"], WfNode>,
  fragment: WebstudioFragment
) => {
  if (added.get(wfNode._id) || "text" in wfNode || "type" in wfNode === false) {
    return;
  }
  const children: Instance["children"] = [];
  const instanceId = nanoid();
  for (const wfChildId of wfNode.children) {
    const wfChildNode = wfNodes.get(wfChildId);
    if (wfChildNode === undefined) {
      continue;
    }
    if ("text" in wfChildNode) {
      children.push({
        type: "text",
        value: wfChildNode.v,
      });
      added.set(wfChildId, instanceId);
      continue;
    }

    const childInstanceId = addInstanceAndProperties(
      wfChildNode,
      added,
      wfNodes,
      fragment
    );
    if (childInstanceId !== undefined) {
      children.push({
        type: "id",
        value: childInstanceId,
      });
    }
  }

  const { component, props } = mapComponentAndProperties(wfNode, instanceId);

  fragment.instances.push({
    id: instanceId,
    type: "instance",
    component,
    children,
  });
  added.set(wfNode._id, instanceId);
  addAttributes(wfNode, instanceId, props);
  fragment.props.push(...props);

  return instanceId;
};
