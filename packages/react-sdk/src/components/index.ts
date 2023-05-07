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
import { meta as LabelMeta } from "./label.ws";
import { meta as SuccessMessageMeta } from "./success-message.ws";
import { meta as ErrorMessageMeta } from "./error-message.ws";
import { meta as TextareaMeta } from "./textarea.ws";
import { meta as RadioButtonFieldMeta } from "./radio-button-field.ws";
import { meta as RadioButtonMeta } from "./radio-button.ws";
import { meta as CheckboxFieldMeta } from "./checkbox-field.ws";
import { meta as CheckboxMeta } from "./checkbox.ws";

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
import { propsMeta as LabelPropsMeta } from "./label.ws";
import { propsMeta as SuccessMessagePropsMeta } from "./success-message.ws";
import { propsMeta as ErrorMessagePropsMeta } from "./error-message.ws";
import { propsMeta as TextareaPropsMeta } from "./textarea.ws";
import { propsMeta as RadioButtonFieldPropsMeta } from "./radio-button-field.ws";
import { propsMeta as RadioButtonPropsMeta } from "./radio-button.ws";
import { propsMeta as CheckboxFieldPropsMeta } from "./checkbox-field.ws";
import { propsMeta as CheckboxPropsMeta } from "./checkbox.ws";
import { ELEMENTS } from "./elements";

// @todo this list should not be hardcoded!
const defaultMetas: Record<ELEMENTS, WsComponentMeta> = {
  [ELEMENTS.SLOT]: SlotMeta,
  [ELEMENTS.FRAGMENT]: FragmentMeta,
  [ELEMENTS.BOX]: BoxMeta,
  [ELEMENTS.BODY]: BodyMeta,
  [ELEMENTS.TEXT_BLOCK]: TextBlockMeta,
  [ELEMENTS.HEADINNG]: HeadingMeta,
  [ELEMENTS.PARAGRAPH]: ParagraphMeta,
  [ELEMENTS.LINK]: LinkMeta,
  [ELEMENTS.LINK_BLOCK]: LinkBlockMeta,
  [ELEMENTS.RICH_TEXT_LINK]: RichTextLinkMeta,
  [ELEMENTS.SPAN]: SpanMeta,
  [ELEMENTS.BOLD]: BoldMeta,
  [ELEMENTS.ITALIC]: ItalicMeta,
  [ELEMENTS.SUPERSCRIPT]: SuperscriptMeta,
  [ELEMENTS.SUBSCRIPT]: SubscriptMeta,
  [ELEMENTS.BUTTON]: ButtonMeta,
  [ELEMENTS.INPUT]: InputMeta,
  [ELEMENTS.FORM]: FormMeta,
  [ELEMENTS.IMAGE]: ImageMeta,
  [ELEMENTS.BLOCKQUOTE]: BlockquoteMeta,
  [ELEMENTS.LIST]: ListMeta,
  [ELEMENTS.LIST_ITEM]: ListItemMeta,
  [ELEMENTS.SEPERATOR]: SeparatorMeta,
  [ELEMENTS.CODE]: CodeMeta,
  [ELEMENTS.LABEL]: LabelMeta,
  [ELEMENTS.SUCCESS_MESSAGE]: SuccessMessageMeta,
  [ELEMENTS.ERROR_MESSAGE]: ErrorMessageMeta,
  [ELEMENTS.TEXT_AREA]: TextareaMeta,
  [ELEMENTS.RADIO_BUTTON_FIELD]: RadioButtonFieldMeta,
  [ELEMENTS.RADIO_BUTTON]: RadioButtonMeta,
  [ELEMENTS.CHECKBOX_FIELD]: CheckboxFieldMeta,
  [ELEMENTS.CHECKBOX]: CheckboxMeta,
};

let currentMetas = defaultMetas;

export const getComponentMeta = (
  name: ELEMENTS
): WsComponentMeta | undefined => {
  return currentMetas[name];
};

export const registerComponentMetas = (
  overrides: Record<ELEMENTS, Partial<WsComponentMeta>>
) => {
  const elements = Object.keys(defaultMetas) as Array<ELEMENTS>;
  const result = elements.reduce((acc, element) => {
    acc[element] = { ...defaultMetas[element], ...overrides[element] };
    return acc;
  }, {} as Record<ELEMENTS, WsComponentMeta>);

  currentMetas = result;
};

// @todo this list should not be hardcoded!
const defaultPropsMetasRaw: Record<ELEMENTS, WsComponentPropsMeta> = {
  [ELEMENTS.SLOT]: SlotMetaPropsMeta,
  [ELEMENTS.FRAGMENT]: FragmentMetaPropsMeta,
  [ELEMENTS.BOX]: BoxMetaPropsMeta,
  [ELEMENTS.BODY]: BodyMetaPropsMeta,
  [ELEMENTS.TEXT_BLOCK]: TextBlockMetaPropsMeta,
  [ELEMENTS.HEADINNG]: HeadingMetaPropsMeta,
  [ELEMENTS.PARAGRAPH]: ParagraphMetaPropsMeta,
  [ELEMENTS.LINK]: LinkMetaPropsMeta,
  [ELEMENTS.LINK_BLOCK]: LinkBlockPropsMeta,
  [ELEMENTS.RICH_TEXT_LINK]: RichTextLinkMetaPropsMeta,
  [ELEMENTS.SPAN]: SpanMetaPropsMeta,
  [ELEMENTS.BOLD]: BoldMetaPropsMeta,
  [ELEMENTS.ITALIC]: ItalicMetaPropsMeta,
  [ELEMENTS.SUPERSCRIPT]: SuperscriptMetaPropsMeta,
  [ELEMENTS.SUBSCRIPT]: SubscriptMetaPropsMeta,
  [ELEMENTS.BUTTON]: ButtonMetaPropsMeta,
  [ELEMENTS.INPUT]: InputMetaPropsMeta,
  [ELEMENTS.FORM]: FormMetaPropsMeta,
  [ELEMENTS.IMAGE]: ImageMetaPropsMeta,
  [ELEMENTS.BLOCKQUOTE]: BlockquotePropsMeta,
  [ELEMENTS.LIST]: ListPropsMeta,
  [ELEMENTS.LIST_ITEM]: ListItemPropsMeta,
  [ELEMENTS.SEPERATOR]: SeparatorPropsMeta,
  [ELEMENTS.CODE]: CodePropsMeta,
  [ELEMENTS.LABEL]: LabelPropsMeta,
  [ELEMENTS.SUCCESS_MESSAGE]: SuccessMessagePropsMeta,
  [ELEMENTS.ERROR_MESSAGE]: ErrorMessagePropsMeta,
  [ELEMENTS.TEXT_AREA]: TextareaPropsMeta,
  [ELEMENTS.RADIO_BUTTON_FIELD]: RadioButtonFieldPropsMeta,
  [ELEMENTS.RADIO_BUTTON]: RadioButtonPropsMeta,
  [ELEMENTS.CHECKBOX_FIELD]: CheckboxFieldPropsMeta,
  [ELEMENTS.CHECKBOX]: CheckboxPropsMeta,
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
  parentComponent: ELEMENTS,
  childComponent: ELEMENTS
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
