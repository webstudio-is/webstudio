import { ComponentStoryObj } from "@storybook/react";
import { getComponentMetaProps, type UserProp } from "@webstudio-is/react-sdk";
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
            type: "boolean",
            value: true,
          },
        ],
        instanceId: "2",
        treeId: "1",
      },
    },
  },
};

export const RequiredProps: ComponentStoryObj<typeof PropsPanel> = {
  args: {
    selectedInstanceData: {
      id: "1",
      component: "Link",
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

const meta = getComponentMetaProps("Button");

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
        props: Object.entries(meta).map(([prop, value]) => {
          return {
            id: prop,
            prop,
            value: value?.defaultValue ?? "",
          } as UserProp;
        }),
      },
    },
  },
};
