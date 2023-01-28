import type { ComponentStory } from "@storybook/react";
import type { PropsItem } from "@webstudio-is/project-build";
import { getComponentMetaProps } from "@webstudio-is/react-sdk";
import { propsStore } from "~/shared/nano-states";
import { PropsPanel } from "./props-panel";

export default {
  title: "Props Panel",
  component: PropsPanel,
};

export const NoProps: ComponentStory<typeof PropsPanel> = () => {
  propsStore.set([
    {
      id: "disabled",
      instanceId: "1",
      name: "disabled",
      type: "boolean",
      value: true,
    },
  ]);
  return (
    <PropsPanel
      selectedInstance={{
        type: "instance",
        id: "1",
        component: "Button",
        children: [],
      }}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      publish={() => {}}
    />
  );
};

export const RequiredProps: ComponentStory<typeof PropsPanel> = () => {
  propsStore.set([]);
  return (
    <PropsPanel
      selectedInstance={{
        type: "instance",
        id: "1",
        component: "Link",
        children: [],
      }}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      publish={() => {}}
    />
  );
};

export const DefaultProps: ComponentStory<typeof PropsPanel> = () => {
  propsStore.set([]);
  return (
    <PropsPanel
      selectedInstance={{
        type: "instance",
        id: "1",
        component: "Button",
        children: [],
      }}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      publish={() => {}}
    />
  );
};

const meta = getComponentMetaProps("Button") ?? {};

export const AllProps: ComponentStory<typeof PropsPanel> = () => {
  propsStore.set(
    Object.entries(meta).map(([name, value]) => {
      return {
        id: name,
        instanceId: "3",
        name,
        value: value?.defaultValue ?? "",
      } as PropsItem;
    })
  );
  return (
    <PropsPanel
      selectedInstance={{
        type: "instance",
        id: "3",
        component: "Heading",
        children: [],
      }}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      publish={() => {}}
    />
  );
};
