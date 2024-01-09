import { useState } from "react";
import type { Instance, Prop, Asset } from "@webstudio-is/sdk";
import type { PropMeta } from "@webstudio-is/react-sdk";
import { textVariants } from "@webstudio-is/design-system";
import { PropsSection } from "./props-section";
import { usePropsLogic } from "./use-props-logic";
import {
  $assets,
  $instances,
  $pages,
  $props,
  registerComponentLibrary,
  $selectedPageId,
} from "~/shared/nano-states";
import { setMockEnv } from "~/shared/env";
// eslint-disable-next-line import/no-internal-modules
import catPath from "./props-panel.stories.assets/cat.jpg";

setMockEnv({ ASSET_BASE_URL: catPath.replace("cat.jpg", "") });

let id = 0;
const unique = () => `${++id}`;

const instanceId = unique();
const projectId = unique();

const page = (name: string, path: string) => ({
  id: unique(),
  name,
  title: name,
  path,
  meta: {},
  rootInstanceId: unique(),
});

$pages.set({
  meta: {},
  homePage: page("Home", "/"),
  pages: [
    page("About", "/about"),
    page("Pricing", "/pricing"),
    page("Contacts", "/contacts"),
  ],
});

const getSectionInstanceId = (name: string, page = $pages.get()?.homePage) =>
  page === undefined ? "" : `${page.id}-${name}`;

const addLinkableSections = (
  names: string[],
  page = $pages.get()?.homePage
) => {
  if (page === undefined) {
    return;
  }

  const instances = $instances.get();
  const props = $props.get();

  const rootInstance: Instance = {
    id: page.rootInstanceId,
    type: "instance",
    component: "body",
    children: [],
  };
  instances.set(rootInstance.id, rootInstance);

  for (const name of names) {
    const instance: Instance = {
      id: getSectionInstanceId(name, page),
      type: "instance",
      component: "box",
      children: [],
    };
    rootInstance.children.push({ type: "id", value: instance.id });
    instances.set(instance.id, instance);

    const prop: Prop = {
      id: unique(),
      instanceId: instance.id,
      name: "id",
      type: "string",
      value: name,
    };
    props.set(prop.id, prop);
  }
  return rootInstance;
};

addLinkableSections(["contacts", "about"]);
const rootInstance = addLinkableSections(
  ["company", "employees"],
  $pages.get()?.pages[0]
);
$selectedPageId.set($pages.get()?.homePage.id);

const instance: Instance = {
  id: instanceId,
  type: "instance",
  component: "Box",
  children: [],
};
rootInstance?.children.push({ type: "id", value: instance.id });

const imageAsset = (name = "cat", format = "jpg"): Asset => ({
  id: unique(),
  projectId,
  type: "image",
  name: `${name}.${format}`,
  format: format,
  size: 100000,
  createdAt: new Date().toISOString(),
  description: null,
  meta: { width: 128, height: 180 },
});

$assets.set(
  new Map(
    [imageAsset("cat"), imageAsset("car", "png"), imageAsset("beach")].map(
      (asset) => [asset.id, asset]
    )
  )
);

const textProp = (label?: string, defaultValue?: string): PropMeta => ({
  type: "string",
  control: "text",
  required: false,
  rows: 2,
  label,
  defaultValue,
});

const shortTextProp = (label?: string): PropMeta => ({
  type: "string",
  control: "text",
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

const fileProp = (label?: string, accept?: string): PropMeta => ({
  type: "string",
  control: "file",
  required: false,
  label,
  accept,
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

registerComponentLibrary({
  components: {},
  metas: {},
  propsMetas: {
    Box: {
      props: {
        initialText: textProp("", "multi\nline"),
        initialShortText: shortTextProp(),
        initialNumber: numberProp(),
        initialBoolean: booleanProp(),
        initialColor: colorProp(),
        initialRadio: radioProp(),
        initialSelect: selectProp(),
        initialCheck: checkProp(),
        initialUrl: urlProp(),
        initialFile: fileProp("Initial File (PNG only)", ".png"),
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
        addedUrlSection: urlProp("Added URL (Section)"),
        addedUrlEmail: urlProp("Added URL (Email)"),
        addedUrlPhone: urlProp("Added URL (Phone)"),
        addedUrlAttachment: urlProp("Added URL (Attachment)"),
        addedFile: fileProp(),
        availableText: textProp(),
        availableShortText: shortTextProp(),
        availableNumber: numberProp(),
        availableBoolean: booleanProp(),
        availableColor: colorProp(),
        availableRadio: radioProp(),
        availableSelect: selectProp(),
        availableCheck: checkProp(),
        availableUrl: urlProp(),
        availableFile: fileProp(),
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
        "initialFile",
      ],
    },
  },
});

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
    value: $pages.get()?.pages[0].id ?? "",
  },
  {
    id: unique(),
    instanceId,
    name: "addedUrlSection",
    type: "page",
    value: {
      pageId: $pages.get()?.homePage.id ?? "",
      instanceId: getSectionInstanceId("about"),
    },
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
  {
    id: unique(),
    instanceId,
    name: "addedUrlAttachment",
    type: "asset",
    value: (Array.from($assets.get().keys())[0] as string) ?? "",
  },
  {
    id: unique(),
    instanceId,
    name: "addedFile",
    type: "asset",
    value: (Array.from($assets.get().keys())[0] as string) ?? "",
  },
];

export const Story = () => {
  const [props, setProps] = useState(startingProps);

  const handleDelete = (id: Prop["id"]) => {
    setProps((current) => current.filter((prop) => prop.id !== id));
  };

  const handleUpdate = (prop: Prop) => {
    setProps((current) => {
      const exists = current.find((item) => item.id === prop.id) !== undefined;
      return exists
        ? current.map((item) => (item.id === prop.id ? prop : item))
        : [...current, prop];
    });
  };

  const logic = usePropsLogic({
    instance,
    props,
    updateProp: handleUpdate,
    deleteProp: handleDelete,
  });

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ width: 240, border: "dashed 3px #e3e3e3" }}>
        <PropsSection
          instanceId={instanceId}
          propsLogic={logic}
          propValues={new Map()}
          component="Button"
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
export default {
  component: Story,
  parameters: {
    lostpixel: {
      // this is to fix cutting off the after scroll area in the screenshot
      waitBeforeScreenshot: 5000,
    },
  },
};
