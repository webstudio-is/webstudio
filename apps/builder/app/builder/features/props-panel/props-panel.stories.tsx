import { useState } from "react";
import { ButtonElementIcon } from "@webstudio-is/icons";
import { PropsPanel } from "./props-panel";
import { usePropsLogic } from "./use-props-logic";
import { pagesStore } from "~/shared/nano-states";
import type { Prop } from "@webstudio-is/project-build";
import type {
  WsComponentMeta,
  WsComponentPropsMeta,
} from "@webstudio-is/react-sdk";

const page = (name: string, path: string) => ({
  id: Math.random().toString(),
  name,
  title: name,
  path,
  meta: {},
  rootInstanceId: "1",
});

pagesStore.set({
  homePage: page("Home", "/"),
  pages: [
    page("About", "/about"),
    page("Pricing", "/pricing"),
    page("Contacts", "/contacts"),
  ],
});

type PropMeta = WsComponentPropsMeta["props"][string];

const textProp = (label?: string): PropMeta => ({
  type: "string",
  control: "text",
  required: false,
  label,
});

const shortTextProp = (label?: string): PropMeta => ({
  type: "string",
  control: "text",
  rows: 0,
  required: false,
  label,
});

const numberProp = (label?: string): PropMeta => ({
  type: "number",
  control: "number",
  required: false,
  label,
});

const booleanProp = (label?: string): PropMeta => ({
  type: "boolean",
  control: "boolean",
  required: false,
  label,
});

const colorProp = (label?: string): PropMeta => ({
  type: "string",
  control: "color",
  required: false,
  label,
});

const urlProp = (label?: string): PropMeta => ({
  type: "string",
  control: "url",
  required: false,
  label,
});

const defaultOptions = ["one", "two", "three-the-very-long-one-so-much-long"];

const radioProp = (options = defaultOptions, label?: string): PropMeta => ({
  type: "string",
  control: "radio",
  options,
  required: false,
  label,
});

const selectProp = (options = defaultOptions, label?: string): PropMeta => ({
  type: "string",
  control: "select",
  options,
  required: false,
  label,
});

const checkProp = (options = defaultOptions, label?: string): PropMeta => ({
  type: "string[]",
  control: "check",
  options,
  required: false,
  label,
});

const instanceId = "0";

const componentMeta: WsComponentMeta = {
  category: "general",
  type: "rich-text",
  label: "Button",
  Icon: ButtonElementIcon,
};

const componentPropsMeta: WsComponentPropsMeta = {
  props: {
    initialText: textProp(),
    initialShortText: shortTextProp(),
    initialNumber: numberProp(),
    initialBoolean: booleanProp(),
    initialColor: colorProp(),
    initialRadio: radioProp(),
    initialSelect: selectProp(),
    initialCheck: checkProp(),
    initialUrl: urlProp(),
    addedText: textProp(),
    addedShortText: shortTextProp(),
    addedNumber: numberProp(),
    addedBoolean: booleanProp(),
    addedColor: colorProp(),
    addedRadio: radioProp(),
    addedSelect: selectProp(),
    addedCheck: checkProp(),
    addedUrlUrl: urlProp("Added URL (URL)"),
    addedUrlPage: urlProp("Added URL (Page)"),
    availableText: textProp(),
    availableShortText: shortTextProp(),
    availableNumber: numberProp(),
    availableBoolean: booleanProp(),
    availableColor: colorProp(),
    availableRadio: radioProp(),
    availableSelect: selectProp(),
    availableCheck: checkProp(),
    availableUrl: urlProp(),
  },
  initialProps: [
    "initialText",
    "initialShortText",
    "initialNumber",
    "initialBoolean",
    "initialColor",
    "initialRadio",
    "initialSelect",
    "initialCheck",
    "initialUrl",
  ],
};

const startingProps: Prop[] = [
  {
    id: "0",
    instanceId,
    name: "addedText",
    type: "string",
    value: "some text",
  },
  {
    id: "1",
    instanceId,
    name: "addedShortText",
    type: "string",
    value: "some short text",
  },
  {
    id: "2",
    instanceId,
    name: "addedNumber",
    type: "number",
    value: 10,
  },
  {
    id: "3",
    instanceId,
    name: "addedBoolean",
    type: "boolean",
    value: true,
  },
  {
    id: "4",
    instanceId,
    name: "addedColor",
    type: "string",
    value: "#ff0000",
  },
  {
    id: "5",
    instanceId,
    name: "addedRadio",
    type: "string",
    value: "two",
  },
  {
    id: "7",
    instanceId,
    name: "addedSelect",
    type: "string",
    value: "two",
  },
  {
    id: "8",
    instanceId,
    name: "addedCheck",
    type: "string[]",
    value: ["one", "two"],
  },
  {
    id: "9",
    instanceId,
    name: "addedUrlUrl",
    type: "string",
    value: "https://example.com",
  },
  {
    id: "10",
    instanceId,
    name: "addedUrlPage",
    type: "page",
    value: pagesStore.get()?.pages[0].id ?? "",
  },
];

export const Story = () => {
  const [props, setProps] = useState(startingProps);

  const handleDelete = (id: Prop["id"]) => {
    setProps((currernt) => currernt.filter((prop) => prop.id !== id));
  };

  const handleUpdate = (prop: Prop) => {
    setProps((currernt) => {
      const exists = currernt.find((item) => item.id === prop.id) !== undefined;
      return exists
        ? currernt.map((item) => (item.id === prop.id ? prop : item))
        : [...currernt, prop];
    });
  };

  const logic = usePropsLogic({
    props,
    meta: componentPropsMeta,
    instanceId,
    updateProp: handleUpdate,
    deleteProp: handleDelete,
  });

  return (
    <div style={{ width: 240, border: "dashed 3px #e3e3e3" }}>
      <PropsPanel
        propsLogic={logic}
        component="Button"
        instanceLabel="My Button"
        componentMeta={componentMeta}
        setCssProperty={() => () => undefined}
      />
    </div>
  );
};

Story.storyName = "props-panel";
export default { component: Story };
