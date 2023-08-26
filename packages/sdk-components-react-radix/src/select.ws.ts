import {
  SelectIcon,
  TriggerIcon,
  FormTextFieldIcon,
  ContentIcon,
  ItemIcon,
  ViewportIcon,
  TextIcon,
  CheckMarkIcon,
} from "@webstudio-is/icons/svg";
import type {
  EmbedTemplateInstance,
  PresetStyle,
  WsComponentMeta,
  WsComponentPropsMeta,
  WsEmbedTemplate,
} from "@webstudio-is/react-sdk";
import { button, div, span } from "@webstudio-is/react-sdk/css-normalize";
import * as tc from "./theme/tailwind-classes";
import {
  propsSelect,
  propsSelectContent,
  propsSelectItem,
  propsSelectItemIndicator,
  propsSelectItemText,
  propsSelectTrigger,
  propsSelectValue,
  propsSelectViewport,
} from "./__generated__/select.props";

const presetStyle = {
  div,
} satisfies PresetStyle<"div">;

const createSelectItem = ({
  props,
  children,
}: {
  props?: EmbedTemplateInstance["props"];
  children: WsEmbedTemplate;
}): EmbedTemplateInstance => ({
  type: "instance",
  component: "SelectItem",
  props,
  // relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none
  // focus:bg-accent focus:text-accent-foreground
  // data-[disabled]:pointer-events-none data-[disabled]:opacity-50
  styles: [
    tc.relative(),
    tc.flex(),
    tc.w("full"),
    tc.cursor("default"),
    tc.select("none"),
    tc.items("center"),
    tc.rounded("md"),
    tc.py(1.5),
    tc.pl(8),
    tc.pr(2),
    tc.text("sm"),
    tc.outline("none"),
    tc.focus([tc.bg("accent"), tc.text("accentForeground")].flat()),
    tc.state(
      [tc.pointerEvents("none"), tc.opacity(50)].flat(),
      "[data-disabled]"
    ),
  ].flat(),
  children: [
    {
      type: "instance",
      component: "SelectItemIndicator",
      // absolute left-2 flex h-3.5 w-3.5 items-center justify-center
      styles: [
        tc.absolute(),
        tc.left(2),
        tc.flex(),
        tc.h(3.5),
        tc.w(3.5),
        tc.items("center"),
        tc.justify("center"),
      ].flat(),
      children: [
        {
          type: "instance",
          component: "HtmlEmbed",
          label: "Indicator Icon",
          props: [
            {
              type: "string",
              name: "code",
              value: CheckMarkIcon,
            },
          ],
          children: [],
        },
      ],
    },
    {
      type: "instance",
      component: "SelectItemText",
      children,
    },
  ],
});

export const metaSelect: WsComponentMeta = {
  category: "radix",
  order: 10,
  type: "container",
  icon: SelectIcon,
  stylable: false,
  template: [
    {
      type: "instance",
      component: "Select",
      dataSources: {
        selectValue: { type: "variable", initialValue: "" },
        selectOpen: { type: "variable", initialValue: false },
      },
      props: [
        {
          name: "value",
          type: "dataSource",
          dataSourceName: "selectValue",
        },
        {
          name: "onValueChange",
          type: "action",
          value: [
            { type: "execute", args: ["value"], code: `selectValue = value` },
          ],
        },
        {
          name: "open",
          type: "dataSource",
          dataSourceName: "selectOpen",
        },
        {
          name: "onOpenChange",
          type: "action",
          value: [
            { type: "execute", args: ["open"], code: `selectOpen = open` },
          ],
        },
      ],
      children: [
        {
          type: "instance",
          component: "SelectTrigger",
          // flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background
          // placeholder:text-muted-foreground
          // focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          // disabled:cursor-not-allowed disabled:opacity-50
          styles: [
            tc.flex(),
            tc.h(10),
            tc.w("full"),
            tc.items("center"),
            tc.justify("between"),
            tc.rounded("md"),
            tc.border(),
            tc.border("input"),
            tc.bg("background"),
            tc.px(3),
            tc.py(2),
            tc.text("sm"),
            tc.state([tc.text("mutedForeground")].flat(), "::placeholder"),
            tc.focus(
              [tc.outline("none"), tc.ring("ring", 2, "background", 2)].flat()
            ),
            tc.disabled([tc.cursor("not-allowed"), tc.opacity(50)].flat()),
          ].flat(),
          children: [
            {
              type: "instance",
              component: "SelectValue",
              props: [{ name: "placeholder", type: "string", value: "Theme" }],
              children: [],
            },
          ],
        },
        {
          type: "instance",
          component: "SelectContent",
          // relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md
          // data-[state=open]:animate-in
          // data-[state=closed]:animate-out data-[state=closed]:fade-out-0
          // data-[state=open]:fade-in-0
          // data-[state=closed]:zoom-out-95
          // data-[state=open]:zoom-in-95
          // data-[side=bottom]:slide-in-from-top-2
          // data-[side=left]:slide-in-from-right-2
          // data-[side=right]:slide-in-from-left-2
          // data-[side=top]:slide-in-from-bottom-2
          // position=popper
          // data-[side=bottom]:translate-y-1
          // data-[side=left]:-translate-x-1
          // data-[side=right]:translate-x-1
          // data-[side=top]:-translate-y-1
          styles: [
            tc.relative(),
            tc.z(50),
            tc.property("minWidth", "8rem"),
            tc.overflow("hidden"),
            tc.rounded("md"),
            tc.border(),
            tc.bg("popover"),
            tc.text("popoverForeground"),
            tc.shadow("md"),
          ].flat(),
          children: [
            {
              type: "instance",
              component: "SelectViewport",
              // p-1
              // position=popper
              // h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]
              styles: [
                tc.p(1),
                tc.property("height", "--radix-select-trigger-height"),
                tc.w("full"),
                tc.property("minWidth", "--radix-select-trigger-width"),
              ].flat(),
              children: [
                createSelectItem({
                  props: [{ name: "value", type: "string", value: "light" }],
                  children: [{ type: "text", value: "Light" }],
                }),
                createSelectItem({
                  props: [{ name: "value", type: "string", value: "dark" }],
                  children: [{ type: "text", value: "Dark" }],
                }),
                createSelectItem({
                  props: [{ name: "value", type: "string", value: "system" }],
                  children: [{ type: "text", value: "System" }],
                }),
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const metaSelectTrigger: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: TriggerIcon,
  detachable: false,
  presetStyle: {
    button,
  },
};

export const metaSelectValue: WsComponentMeta = {
  category: "hidden",
  type: "container",
  label: "Value",
  icon: FormTextFieldIcon,
  detachable: false,
  presetStyle: {
    span,
  },
};

export const metaSelectContent: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: ContentIcon,
  detachable: false,
  presetStyle,
};

export const metaSelectViewport: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: ViewportIcon,
  detachable: false,
  presetStyle,
};

export const metaSelectItem: WsComponentMeta = {
  category: "hidden",
  type: "container",
  icon: ItemIcon,
  requiredAncestors: ["SelectViewport"],
  presetStyle,
};

export const metaSelectItemIndicator: WsComponentMeta = {
  category: "hidden",
  type: "container",
  label: "Indicator",
  icon: CheckMarkIcon,
  detachable: false,
  requiredAncestors: ["SelectItem"],
  presetStyle: {
    span,
  },
};

export const metaSelectItemText: WsComponentMeta = {
  category: "hidden",
  type: "container",
  label: "Item Text",
  icon: TextIcon,
  detachable: false,
  requiredAncestors: ["SelectItem"],
  presetStyle: {
    span,
  },
};

export const propsMetaSelect: WsComponentPropsMeta = {
  props: propsSelect,
  initialProps: ["value", "open", "name", "required"],
};

export const propsMetaSelectTrigger: WsComponentPropsMeta = {
  props: propsSelectTrigger,
};

export const propsMetaSelectValue: WsComponentPropsMeta = {
  props: propsSelectValue,
  initialProps: ["placeholder"],
};

export const propsMetaSelectContent: WsComponentPropsMeta = {
  props: propsSelectContent,
};

export const propsMetaSelectViewport: WsComponentPropsMeta = {
  props: propsSelectViewport,
};

export const propsMetaSelectItem: WsComponentPropsMeta = {
  props: propsSelectItem,
  initialProps: ["value"],
};

export const propsMetaSelectItemIndicator: WsComponentPropsMeta = {
  props: propsSelectItemIndicator,
};

export const propsMetaSelectItemText: WsComponentPropsMeta = {
  props: propsSelectItemText,
};
