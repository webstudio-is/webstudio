import { ComponentStoryObj } from "@storybook/react";
import { componentsMeta, type UserProp } from "@webstudio-is/sdk";
import { PropsPanel } from "./props-panel";

export default {
  title: "Props Panel",
  component: PropsPanel,
};

export const NoProps: ComponentStoryObj<typeof PropsPanel> = {
  args: {
    selectedInstanceData: {
      id: "1",
      component: "Button",
      cssRules: [],
      browserStyle: {},
      props: {
        id: "1",
        props: [
          {
            id: "disabled",
            prop: "disabled",
            value: true,
          },
        ],
        instanceId: "2",
        treeId: "1",
      },
    },
  },
};

export const DefaultProps: ComponentStoryObj<typeof PropsPanel> = {
  args: {
    selectedInstanceData: {
      id: "1",
      component: "Button",
      cssRules: [],
      browserStyle: {},
      props: {
        id: "1",
        props: [],
        instanceId: "2",
        treeId: "1",
      },
    },
  },
};

const meta = componentsMeta["Button"];
const argTypes = meta?.argTypes as Record<
  string,
  { control: { defaultValue?: unknown } }
>; // TODO: Add type to argTypes

export const AllProps: ComponentStoryObj<typeof PropsPanel> = {
  args: {
    selectedInstanceData: {
      id: "3",
      component: "Heading",
      cssRules: [],
      browserStyle: {},
      props: {
        id: "2",
        instanceId: "2",
        treeId: "1",
        props: Object.entries(argTypes).map(([prop, value]) => {
          return {
            id: `${prop}`,
            prop,
            value: value.control.defaultValue,
          } as UserProp;
        }),
      },
    },
  },
};
