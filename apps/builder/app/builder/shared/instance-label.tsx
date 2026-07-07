import type { HtmlTags } from "html-tags";
import { useStore } from "@nanostores/react";
import {
  BlockquoteIcon,
  BodyIcon,
  BoldIcon,
  BoxIcon,
  BracesIcon,
  ButtonElementIcon,
  CalendarIcon,
  FormIcon,
  FormTextAreaIcon,
  FormTextFieldIcon,
  HeadingIcon,
  ImageIcon,
  ItemIcon,
  LabelIcon,
  LinkIcon,
  ListIcon,
  ListItemIcon,
  MinusIcon,
  SelectIcon,
  SubscriptIcon,
  SuperscriptIcon,
  TextAlignLeftIcon,
  TextItalicIcon,
} from "@webstudio-is/icons/svg";
import {
  elementComponent,
  parseComponentName,
  ROOT_INSTANCE_ID,
  type Instance,
} from "@webstudio-is/sdk";
import { $instances } from "~/shared/sync/data-stores";
import { $registeredComponentMetas } from "~/shared/nano-states";
import { humanizeString } from "~/shared/string-utils";

const htmlIcons: Record<string, undefined | string> = {
  // typography
  h1: HeadingIcon,
  h2: HeadingIcon,
  h3: HeadingIcon,
  h4: HeadingIcon,
  h5: HeadingIcon,
  h6: HeadingIcon,
  p: TextAlignLeftIcon,
  blockquote: BlockquoteIcon,
  code: BracesIcon,
  ul: ListIcon,
  ol: ListIcon,
  li: ListItemIcon,
  hr: MinusIcon,
  // rich text
  b: BoldIcon,
  strong: BoldIcon,
  i: TextItalicIcon,
  em: TextItalicIcon,
  sub: SubscriptIcon,
  sup: SuperscriptIcon,
  a: LinkIcon,
  // form
  form: FormIcon,
  textarea: FormTextAreaIcon,
  button: ButtonElementIcon,
  input: FormTextFieldIcon,
  label: LabelIcon,
  select: SelectIcon,
  option: ItemIcon,
  // misc
  body: BodyIcon,
  time: CalendarIcon,
  img: ImageIcon,
} satisfies Partial<Record<HtmlTags, undefined | string>>;

type InstanceLike = {
  component: string;
  label?: string;
  tag?: string;
};

type Props = {
  size?: number | string;
  instance: InstanceLike;
  icon?: string;
};

export const InstanceIcon = ({ size = 16, instance, icon }: Props) => {
  const metas = useStore($registeredComponentMetas);
  const meta = metas.get(instance.component);
  // element component should be treated as div when no tag specified
  const elementTag =
    instance.component === elementComponent ? "div" : undefined;
  const tag =
    instance.tag ?? elementTag ?? Object.keys(meta?.presetStyle ?? {})[0];
  const computedIcon = icon ?? meta?.icon ?? htmlIcons[tag] ?? BoxIcon;
  return (
    <div
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: computedIcon }}
    />
  );
};

const getLabelFromComponentName = (component: Instance["component"]) => {
  const [_namespace, componentName] = parseComponentName(component);
  return humanizeString(componentName);
};

export const getInstanceLabel = (
  instanceOrInstanceId: InstanceLike | string
): string => {
  if (typeof instanceOrInstanceId === "string") {
    if (instanceOrInstanceId === ROOT_INSTANCE_ID) {
      return "Root";
    }
    const instance = $instances.get().get(instanceOrInstanceId);
    if (instance) {
      return getInstanceLabel(instance);
    }
    return "Unknown";
  }

  if (instanceOrInstanceId.label) {
    return instanceOrInstanceId.label;
  }
  if (
    instanceOrInstanceId.component === elementComponent &&
    instanceOrInstanceId.tag
  ) {
    return `<${instanceOrInstanceId.tag}>`;
  }
  const meta = $registeredComponentMetas
    .get()
    .get(instanceOrInstanceId.component);
  return (
    meta?.label || getLabelFromComponentName(instanceOrInstanceId.component)
  );
};
