import { PropMeta } from "@webstudio-is/generate-arg-types";
import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import type { ComponentName } from "./components-utils";
import { meta as SlotMeta } from "./slot.ws";
import { meta as FragmentMeta } from "./fragment.ws";
import { meta as BodyMeta } from "./body.ws";
import { meta as BoxMeta } from "./box.ws";
import { meta as TextBlockMeta } from "./text-block.ws";
import { meta as HeadingMeta } from "./heading.ws";
import { meta as ParagraphMeta } from "./paragraph.ws";
import { meta as LinkMeta } from "./link.ws";
import { meta as LinkBlockMeta } from "./link-block.ws";
import { meta as RichTextLinkMeta } from "./rich-text-link.ws";
import { meta as SpanMeta } from "./span.ws";
import { meta as BoldMeta } from "./bold.ws";
import { meta as ItalicMeta } from "./italic.ws";
import { meta as SuperscriptMeta } from "./superscript.ws";
import { meta as SubscriptMeta } from "./subscript.ws";
import { meta as ButtonMeta } from "./button.ws";
import { meta as InputMeta } from "./input.ws";
import { meta as FormMeta } from "./form.ws";
import { meta as ImageMeta } from "./image.ws";
import { meta as BlockquoteMeta } from "./blockquote.ws";
import { meta as ListMeta } from "./list.ws";
import { meta as ListItemMeta } from "./list-item.ws";
import { meta as SeparatorMeta } from "./separator.ws";
import { meta as CodeMeta } from "./code.ws";

// these are huge JSON objects that we want to be tree-shaken when not used!
import { propsMeta as SlotMetaPropsMeta } from "./slot.ws";
import { propsMeta as FragmentMetaPropsMeta } from "./fragment.ws";
import { propsMeta as BodyMetaPropsMeta } from "./body.ws";
import { propsMeta as BoxMetaPropsMeta } from "./box.ws";
import { propsMeta as TextBlockMetaPropsMeta } from "./text-block.ws";
import { propsMeta as HeadingMetaPropsMeta } from "./heading.ws";
import { propsMeta as ParagraphMetaPropsMeta } from "./paragraph.ws";
import { propsMeta as LinkMetaPropsMeta } from "./link.ws";
import { propsMeta as LinkBlockPropsMeta } from "./link-block.ws";
import { propsMeta as RichTextLinkMetaPropsMeta } from "./rich-text-link.ws";
import { propsMeta as SpanMetaPropsMeta } from "./span.ws";
import { propsMeta as BoldMetaPropsMeta } from "./bold.ws";
import { propsMeta as ItalicMetaPropsMeta } from "./italic.ws";
import { propsMeta as SuperscriptMetaPropsMeta } from "./superscript.ws";
import { propsMeta as SubscriptMetaPropsMeta } from "./subscript.ws";
import { propsMeta as ButtonMetaPropsMeta } from "./button.ws";
import { propsMeta as InputMetaPropsMeta } from "./input.ws";
import { propsMeta as FormMetaPropsMeta } from "./form.ws";
import { propsMeta as ImageMetaPropsMeta } from "./image.ws";
import { propsMeta as BlockquotePropsMeta } from "./blockquote.ws";
import { propsMeta as ListPropsMeta } from "./list.ws";
import { propsMeta as ListItemPropsMeta } from "./list-item.ws";
import { propsMeta as SeparatorPropsMeta } from "./separator.ws";
import { propsMeta as CodePropsMeta } from "./code.ws";

// @todo this list should not be hardcoded!
const defaultMetas: Record<string, WsComponentMeta> = {
  Slot: SlotMeta,
  Fragment: FragmentMeta,
  Box: BoxMeta,
  Body: BodyMeta,
  TextBlock: TextBlockMeta,
  Heading: HeadingMeta,
  Paragraph: ParagraphMeta,
  Link: LinkMeta,
  LinkBlock: LinkBlockMeta,
  RichTextLink: RichTextLinkMeta,
  Span: SpanMeta,
  Bold: BoldMeta,
  Italic: ItalicMeta,
  Superscript: SuperscriptMeta,
  Subscript: SubscriptMeta,
  Button: ButtonMeta,
  Input: InputMeta,
  Form: FormMeta,
  Image: ImageMeta,
  Blockquote: BlockquoteMeta,
  List: ListMeta,
  ListItem: ListItemMeta,
  Separator: SeparatorMeta,
  Code: CodeMeta,
};

let currentMetas = defaultMetas;

export const getComponentMeta = (name: string): WsComponentMeta | undefined => {
  return currentMetas[name];
};

export const registerComponentMetas = (
  overrides: Record<string, Partial<WsComponentMeta>>
) => {
  const result: typeof currentMetas = {};
  for (const name of Object.keys(defaultMetas)) {
    result[name] = { ...defaultMetas[name], ...overrides[name] };
  }
  currentMetas = result;
};

// @todo this list should not be hardcoded!
const defaultPropsMetasRaw = {
  Slot: SlotMetaPropsMeta,
  Fragment: FragmentMetaPropsMeta,
  Box: BoxMetaPropsMeta,
  Body: BodyMetaPropsMeta,
  TextBlock: TextBlockMetaPropsMeta,
  Heading: HeadingMetaPropsMeta,
  Paragraph: ParagraphMetaPropsMeta,
  Link: LinkMetaPropsMeta,
  LinkBlock: LinkBlockPropsMeta,
  RichTextLink: RichTextLinkMetaPropsMeta,
  Span: SpanMetaPropsMeta,
  Bold: BoldMetaPropsMeta,
  Italic: ItalicMetaPropsMeta,
  Superscript: SuperscriptMetaPropsMeta,
  Subscript: SubscriptMetaPropsMeta,
  Button: ButtonMetaPropsMeta,
  Input: InputMetaPropsMeta,
  Form: FormMetaPropsMeta,
  Image: ImageMetaPropsMeta,
  Blockquote: BlockquotePropsMeta,
  List: ListPropsMeta,
  ListItem: ListItemPropsMeta,
  Separator: SeparatorPropsMeta,
  Code: CodePropsMeta,
} as const;

const defaultPropsMetas: Record<string, WsComponentPropsMeta> =
  defaultPropsMetasRaw;

let registeredPropsMetas: Record<string, Partial<WsComponentPropsMeta>> = {};

// we start as `undefined` because pre-computing will likely kill tree-shaking
let currentPropsMetas: Record<string, WsComponentPropsMeta> | undefined =
  undefined;

export const getComponentPropsMeta = (
  name: string
): WsComponentPropsMeta | undefined => {
  if (currentPropsMetas === undefined) {
    currentPropsMetas = {};
    for (const name of Object.keys(defaultPropsMetas)) {
      const props = computeProps(
        defaultPropsMetas[name],
        registeredPropsMetas[name] ?? {}
      );
      const initialProps = computeInitialProps(
        props,
        defaultPropsMetas[name],
        registeredPropsMetas[name] ?? {}
      );
      currentPropsMetas[name] = { props, initialProps };
    }
  }

  return currentPropsMetas[name];
};

export const registerComponentPropsMetas = (
  metas: Record<string, WsComponentPropsMeta>
) => {
  registeredPropsMetas = metas;
  currentPropsMetas = undefined;
};

type RegisteredComponents = Partial<{
  // eslint-disable-next-line @typescript-eslint/ban-types
  [name in ComponentName]: {};
}>;

export let registeredComponents: RegisteredComponents | undefined;

/**
 *  @todo: Allow register any component.
 * Now we can register only existings Components, as all our type system would
 * break otherwise, see getComponent etc. So its overwriteComponent now
 **/
export const registerComponents = (components: RegisteredComponents) => {
  registeredComponents = components;
};

const computeProps = (
  defaults: WsComponentPropsMeta,
  overrides: Partial<WsComponentPropsMeta>
) => {
  if (overrides) {
    const allNames = new Set([
      ...Object.keys(defaults.props ?? {}),
      ...Object.keys(overrides?.props ?? {}),
    ]).values();

    const result: WsComponentPropsMeta["props"] = {};
    for (const name of allNames) {
      result[name] = PropMeta.parse({
        ...defaults.props[name],
        ...overrides?.props?.[name],
      });
    }
    return result;
  }

  return defaults.props;
};

const computeInitialProps = (
  props: WsComponentPropsMeta["props"],
  defaults: WsComponentPropsMeta,
  overrides: Partial<WsComponentPropsMeta>
): Array<string> => {
  const initialProps = overrides?.initialProps ?? defaults?.initialProps ?? [];
  const requiredProps = props
    ? Object.entries(props)
        .filter(
          ([name, value]) =>
            value?.required && initialProps.includes(name) === false
        )
        .map(([name]) => name)
    : [];

  // order of initialProps must be preserved
  return [...initialProps, ...requiredProps];
};

export const canAcceptComponent = (
  parentComponent: string,
  childComponent: string
) => {
  const parentMeta = getComponentMeta(parentComponent);
  const childMeta = getComponentMeta(childComponent);
  if (parentMeta?.type !== "container" || childMeta === undefined) {
    return false;
  }
  return (
    childMeta.acceptedParents === undefined ||
    childMeta.acceptedParents.includes(parentComponent)
  );
};
