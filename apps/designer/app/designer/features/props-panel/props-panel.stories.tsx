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
      browserStyle: {},
      props: [
        {
          id: "disabled",
          prop: "disabled",
          type: "boolean",
          value: true,
        },
      ],
    },
  },
};

export const RequiredProps: ComponentStoryObj<typeof PropsPanel> = {
  args: {
    selectedInstanceData: {
      id: "1",
      component: "Link",
      browserStyle: {},
      props: [],
    },
  },
};

export const DefaultProps: ComponentStoryObj<typeof PropsPanel> = {
  args: {
    selectedInstanceData: {
      id: "1",
      component: "Button",
      browserStyle: {},
      props: [],
    },
  },
};

const meta = getComponentMetaProps("Button");

export const AllProps: ComponentStoryObj<typeof PropsPanel> = {
  args: {
    selectedInstanceData: {
      id: "3",
      component: "Heading",
      browserStyle: {},
      props: Object.entries(meta).map(([prop, value]) => {
        return {
          id: prop,
          prop,
          value: value?.defaultValue ?? "",
        } as UserProp;
      }),
    },
  },
};
