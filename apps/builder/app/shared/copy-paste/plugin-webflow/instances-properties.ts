import { nanoid } from "nanoid";
import type { Instance, Prop, WebstudioFragment } from "@webstudio-is/sdk";
import type { WfElementNode, WfNode } from "./schema";
import { showAttribute } from "@webstudio-is/react-sdk";

const toFragment = (
  wfNode: WfElementNode,
  instanceId: Instance["id"]
): WebstudioFragment | undefined => {
  const fragment: WebstudioFragment = {
    children: [],
    instances: [],
    props: [],
    dataSources: [],
    styleSourceSelections: [],
    styleSources: [],
    styles: [],
    assets: [],
    breakpoints: [],
    resources: [],
  };
  const component = wfNode.type;

  const addProp = (
    name: Prop["name"],
    value: Prop["value"],
    type: Prop["type"] = "string"
  ) => {
    const prop = { id: nanoid(), instanceId };

    if (type === "string" && typeof value === "string") {
      fragment.props.push({
        ...prop,
        type,
        name,
        value,
      });
      return;
    }
    if (typeof value === "number") {
      fragment.props.push({
        ...prop,
        type: "number",
        name,
        value,
      });
      return;
    }

    if (typeof value === "boolean") {
      fragment.props.push({
        ...prop,
        type: "boolean",
        name,
        value,
      });
      return;
    }
  };

  const addInstance = (
    component: Instance["component"],
    children: Instance["children"] = [],
    label?: string
  ) => {
    fragment.instances.push({
      id: instanceId,
      type: "instance",
      component,
      children,
      ...(label ? { label } : undefined),
    });
  };

  if (wfNode.data?.attr?.id) {
    addProp("id", wfNode.data.attr.id);
  }

  // Webflow will have conditions: [false, true] when condition is custom and depends on the collection value
  // We only support condition that has a single value.
  const conditions = wfNode.data?.visibility?.conditions ?? [];
  if (conditions.length === 1 && conditions[0] === false) {
    addProp(showAttribute, false);
  }

  switch (component) {
    case "LineBreak": {
      return fragment;
    }
    case "Heading": {
      addProp("tag", wfNode.tag);
      addInstance(component);
      return fragment;
    }
    case "List": {
      if (wfNode.tag === "ol") {
        addProp("ordered", true);
      }
      addInstance(component);
      return fragment;
    }
    case "ListItem":
    case "Paragraph":
    case "Superscript":
    case "Subscript":
    case "Blockquote":
    case "Span": {
      addInstance(component);
      return fragment;
    }
    case "Block": {
      const component = wfNode.data?.text ? "Text" : "Box";
      if (wfNode.tag !== "div") {
        addProp("tag", wfNode.tag);
      }
      addInstance(component);
      return fragment;
    }

    case "Link": {
      const component = "Link";

      const data = wfNode.data;
      if ("url" in data.link) {
        addProp("href", data.link.url);
      }
      if ("target" in data.link) {
        addProp("target", data.link.target);
      }
      if ("href" in data.link) {
        addProp("href", data.link.href);
      }
      if ("email" in data.link) {
        const subject = data.link.subject
          ? `?subject=${data.link.subject}`
          : "";
        addProp("href", `mailto:${data.link.email}${subject}`);
      }
      if ("tel" in data.link) {
        addProp("href", `tel:${data.link.tel}`);
      }
      addInstance(component);
      return fragment;
    }
    case "Section": {
      const component = "Box";
      addProp("tag", wfNode.tag);
      addInstance(component);
      return fragment;
    }
    case "RichText": {
      const component = "Box";
      addInstance(component);
      return fragment;
    }
    case "Strong": {
      const component = "Bold";
      addInstance(component);
      return fragment;
    }
    case "Emphasized": {
      const component = "Italic";
      addInstance(component);
      return fragment;
    }
    case "Container":
    case "BlockContainer": {
      const component = "Box";
      addInstance(component);
      return fragment;
    }
    case "Layout": {
      const component = "Box";
      addInstance(component);
      return fragment;
    }
    case "Cell": {
      const component = "Box";
      addInstance(component);
      return fragment;
    }
    case "VFlex": {
      const component = "Box";
      addInstance(component);
      return fragment;
    }
    case "HFlex": {
      const component = "Box";
      addInstance(component);
      return fragment;
    }
    case "Grid": {
      const component = "Box";
      addInstance(component);
      return fragment;
    }
    case "Row": {
      const component = "Box";
      addInstance(component);
      return fragment;
    }
    case "Column": {
      const component = "Box";
      addInstance(component);
      return fragment;
    }
    case "CodeBlock": {
      const component = "CodeText";
      const data = wfNode.data;
      addProp("lang", data.language);
      addProp("code", data.code);
      addInstance(component);
      return fragment;
    }
    case "HtmlEmbed": {
      addProp("code", wfNode.v);
      addProp("clientOnly", true);
      addInstance(component);
      return fragment;
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
        addProp("alt", data.attr.alt);
      }

      if (data.attr.loading === "eager" || data.attr.loading === "lazy") {
        addProp("loading", data.attr.loading);
      }

      if (data.attr.width && data.attr.width !== "auto") {
        addProp("width", data.attr.width);
      }

      if (data.attr.height && data.attr.height !== "auto") {
        addProp("height", data.attr.height);
      }
      if (data.attr.src) {
        addProp("src", data.attr.src);
      }
      addInstance(component);
      return fragment;
    }
    case "FormWrapper": {
      const component = "Box";
      addInstance(component);
      return fragment;
    }
    case "FormForm": {
      const component = "Box";
      addInstance(component);
      return fragment;
    }
    case "FormErrorMessage":
    case "FormSuccessMessage": {
      return;
    }
    case "FormButton": {
      const component = "Button";
      const data = wfNode.data;
      addInstance(component, [
        {
          type: "text" as const,
          value: data.attr.value,
        },
      ]);
      return fragment;
    }
    case "FormTextInput": {
      const data = wfNode.data;
      const component = "Input";
      addProp("name", data.attr.name);
      addProp("maxLength", data.attr.maxlength);
      addProp("placeholder", data.attr.placeholder);
      addProp("disabled", data.attr.disabled);
      addProp("type", data.attr.type);
      addProp("required", data.attr.required);
      addProp("autoFocus", data.attr.autofocus);
      addInstance(component);
      return fragment;
    }
    case "FormTextarea": {
      const data = wfNode.data;
      const component = "Textarea";
      addProp("name", data.attr.name);
      addProp("maxLength", data.attr.maxlength);
      addProp("placeholder", data.attr.placeholder);
      addProp("required", data.attr.required);
      addProp("autoFocus", data.attr.autofocus);
      addInstance(component);
      return fragment;
    }
    case "FormBlockLabel": {
      const data = wfNode.data;
      const component = "Label";
      addProp("htmlFor", data.attr.for);
      addInstance(component);
      return fragment;
    }
    case "FormCheckboxWrapper": {
      const component = "Label";
      addInstance(component, [], "Checkbox Field");
      return fragment;
    }
    case "FormCheckboxInput": {
      const component = "Checkbox";
      const data = wfNode.data;
      addProp("name", data.attr.name);
      addProp("required", data.attr.required);
      addProp("defaultChecked", data.attr.checked);
      addInstance(component);
      return fragment;
    }
    case "FormInlineLabel": {
      const component = "Text";
      addProp("tag", "span");
      addInstance(component, [], "Label");
      return fragment;
    }
    case "FormRadioWrapper": {
      const component = "Label";
      addInstance(component, [], "Radio Field");
      return fragment;
    }
    case "FormRadioInput": {
      const component = "RadioButton";
      const data = wfNode.data;
      addProp("name", data.attr.name);
      addProp("required", data.attr.required);
      addProp("value", data.attr.value);
      addInstance(component);
      return fragment;
    }
    case "FormSelect": {
      // @todo https://github.com/webstudio-is/webstudio/issues/3601
      const component = "Input";
      const data = wfNode.data;
      addProp("name", data.attr.name);
      addProp("required", data.attr.required);
      addProp("multiple", data.attr.multiple);
      addInstance(component);
      return fragment;
    }
    case "LightboxWrapper": {
      addProp("tag", wfNode.tag);
      addProp("href", wfNode.data?.attr?.href);
      addInstance("Box", [], component);
      return fragment;
    }
    case "NavbarMenu": {
      addProp("tag", wfNode.tag);
      addProp("role", wfNode.data?.attr?.role);

      addInstance("Box", [], component);
      return fragment;
    }
    case "NavbarContainer":
    case "NavbarButton":
    case "NavbarWrapper": {
      addInstance("Box", [], component);
      return fragment;
    }

    case "NavbarBrand":
    case "NavbarLink": {
      const data = wfNode.data;
      if ("url" in data.link) {
        addProp("href", data.link.url);
      }
      if ("target" in data.link) {
        addProp("target", data.link.target);
      }
      if ("href" in data.link) {
        addProp("href", data.link.href);
      }
      if ("email" in data.link) {
        const subject = data.link.subject
          ? `?subject=${data.link.subject}`
          : "";
        addProp("href", `mailto:${data.link.email}${subject}`);
      }
      if ("tel" in data.link) {
        addProp("href", `tel:${data.link.tel}`);
      }
      addInstance("Link", [], component);
      return fragment;
    }

    case "Icon": {
      // We don't have access to widget icons
      addInstance("Box", [], component);
      return fragment;
    }
  }

  (component) satisfies never;
};

const addCustomAttributes = (
  wfNode: WfElementNode,
  instanceId: Instance["id"],
  props: Array<Prop>
) => {
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
  doneNodes: Map<WfNode["_id"], Instance["id"] | false>,
  wfNodes: Map<WfNode["_id"], WfNode>,
  fragment: WebstudioFragment
) => {
  if (
    doneNodes.has(wfNode._id) ||
    "text" in wfNode ||
    "type" in wfNode === false
  ) {
    return;
  }
  const instanceId = nanoid();
  const nextFragment = toFragment(wfNode, instanceId);

  if (nextFragment === undefined) {
    // Skip this node and its children.
    doneNodes.set(wfNode._id, false);
    for (const childId of wfNode.children) {
      doneNodes.set(childId, false);
    }
    return;
  }

  const children: Instance["children"] = [];
  for (const wfChildId of wfNode.children) {
    const wfChildNode = wfNodes.get(wfChildId);
    if (wfChildNode === undefined) {
      continue;
    }
    const value =
      "text" in wfChildNode
        ? wfChildNode.v
        : wfChildNode.type === "LineBreak"
          ? "\n"
          : undefined;

    if (value !== undefined) {
      children.push({
        type: "text",
        value,
      });
      doneNodes.set(wfChildId, instanceId);
      continue;
    }

    const childInstanceId = addInstanceAndProperties(
      wfChildNode,
      doneNodes,
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

  fragment.instances.push(...nextFragment.instances);
  fragment.props.push(...nextFragment.props);
  const instance = fragment.instances.find(
    (instance) => instance.id === instanceId
  );

  if (instance === undefined) {
    return;
  }
  instance.children.push(...children);
  doneNodes.set(wfNode._id, instanceId);
  addCustomAttributes(wfNode, instanceId, fragment.props);

  return instanceId;
};
