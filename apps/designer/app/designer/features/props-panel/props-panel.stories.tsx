import type { ComponentStory } from "@storybook/react";
import {
  allUserPropsContainer,
  getComponentMetaProps,
  type PropsItem,
} from "@webstudio-is/react-sdk";
import { PropsPanel } from "./props-panel";

export default {
  title: "Props Panel",
  component: PropsPanel,
};

export const NoProps: ComponentStory<typeof PropsPanel> = () => {
  allUserPropsContainer.set({
    "1": [
      {
        id: "disabled",
        instanceId: "instanceId",
        name: "disabled",
        type: "boolean",
        value: true,
      },
    ],
  });
  return (
    <PropsPanel
      selectedInstanceData={{
        id: "1",
        component: "Button",
        browserStyle: {},
      }}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      publish={() => {}}
    />
  );
};

export const RequiredProps: ComponentStory<typeof PropsPanel> = () => {
  allUserPropsContainer.set({
    "1": [],
  });
  return (
    <PropsPanel
      selectedInstanceData={{
        id: "1",
        component: "Link",
        browserStyle: {},
      }}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      publish={() => {}}
    />
  );
};

export const DefaultProps: ComponentStory<typeof PropsPanel> = () => {
  allUserPropsContainer.set({
    "1": [],
  });
  return (
    <PropsPanel
      selectedInstanceData={{
        id: "1",
        component: "Button",
        browserStyle: {},
      }}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      publish={() => {}}
    />
  );
};

const meta = getComponentMetaProps("Button");

export const AllProps: ComponentStory<typeof PropsPanel> = () => {
  allUserPropsContainer.set({
    "3": Object.entries(meta).map(([name, value]) => {
      return {
        id: name,
        name,
        value: value?.defaultValue ?? "",
      } as PropsItem;
    }),
  });
  return (
    <PropsPanel
      selectedInstanceData={{
        id: "3",
        component: "Heading",
        browserStyle: {},
      }}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      publish={() => {}}
    />
  );
};
