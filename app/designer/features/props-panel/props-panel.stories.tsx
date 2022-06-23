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
      component: "Heading",
      cssRules: [],
      browserStyle: {},
      props: {
        id: "1",
        props: [],
      },
    },
  },
};

export const DefaultProps: ComponentStoryObj<typeof PropsPanel> = {
  args: {
    selectedInstanceData: {
      id: "2",
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
      },
    },
  },
};

export const AllProps: ComponentStoryObj<typeof PropsPanel> = {
  args: {
    selectedInstanceData: {
      id: "3",
      component: "Heading",
      cssRules: [],
      browserStyle: {},
      props: {
        id: "2",
        props: Object.entries(componentsMeta["Heading"].argTypes).map(
          ([prop, value]) => {
            return {
              id: `${prop}`,
              prop,
              value: value.control.defaultValue,
            } as UserProp;
          }
        ),
      },
    },
  },
};
