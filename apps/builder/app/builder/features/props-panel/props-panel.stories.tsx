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
import { textVariants } from "@webstudio-is/design-system";

let id = 0;
const unique = () => `${++id}`;

const page = (name: string, path: string) => ({
  id: unique(),
  name,
  title: name,
  path,
  meta: {},
  rootInstanceId: unique(),
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

const instanceId = unique();

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
    addedUrlEmail: urlProp("Added URL (Email)"),
    addedUrlPhone: urlProp("Added URL (Phone)"),
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
    id: unique(),
    instanceId,
    name: "addedText",
    type: "string",
    value: "some text",
  },
  {
    id: unique(),
    instanceId,
    name: "addedShortText",
    type: "string",
    value: "some short text",
  },
  {
    id: unique(),
    instanceId,
    name: "addedNumber",
    type: "number",
    value: 10,
  },
  {
    id: unique(),
    instanceId,
    name: "addedBoolean",
    type: "boolean",
    value: true,
  },
  {
    id: unique(),
    instanceId,
    name: "addedColor",
    type: "string",
    value: "#ff0000",
  },
  {
    id: unique(),
    instanceId,
    name: "addedRadio",
    type: "string",
    value: "two",
  },
  {
    id: unique(),
    instanceId,
    name: "addedSelect",
    type: "string",
    value: "two",
  },
  {
    id: unique(),
    instanceId,
    name: "addedCheck",
    type: "string[]",
    value: ["one", "two"],
  },
  {
    id: unique(),
    instanceId,
    name: "addedUrlUrl",
    type: "string",
    value: "https://example.com",
  },
  {
    id: unique(),
    instanceId,
    name: "addedUrlPage",
    type: "page",
    value: pagesStore.get()?.pages[0].id ?? "",
  },
  {
    id: unique(),
    instanceId,
    name: "addedUrlEmail",
    type: "string",
    value: "mailto:hello@example.com?subject=Hello",
  },
  {
    id: unique(),
    instanceId,
    name: "addedUrlPhone",
    type: "string",
    value: "tel:+1234567890",
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
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ width: 240, border: "dashed 3px #e3e3e3" }}>
        <PropsPanel
          propsLogic={logic}
          component="Button"
          instanceLabel="My Button"
          componentMeta={componentMeta}
          setCssProperty={() => () => undefined}
        />
      </div>
      <pre style={textVariants.mono}>
        {props
          .map(
            ({ name, value, type }) =>
              `${name}: ${type} = ${JSON.stringify(value)}`
          )
          .join("\n")}
      </pre>
    </div>
  );
};

Story.storyName = "props-panel";
export default { component: Story };
