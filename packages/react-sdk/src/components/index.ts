import type { WsComponentMeta, WsComponentPropsMeta } from "./component-meta";
import { meta as SlotMeta } from "./slot.ws";
import { meta as FragmentMeta } from "./fragment.ws";
import { meta as HtmlEmbedMeta } from "./html-embed.ws";
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
import { meta as CodeTextMeta } from "./code-text.ws";
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
import { propsMeta as HtmlEmbedMetaPropsMeta } from "./html-embed.ws";
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
import { propsMeta as CodeTextPropsMeta } from "./code-text.ws";
import { propsMeta as LabelPropsMeta } from "./label.ws";
import { propsMeta as SuccessMessagePropsMeta } from "./success-message.ws";
import { propsMeta as ErrorMessagePropsMeta } from "./error-message.ws";
import { propsMeta as TextareaPropsMeta } from "./textarea.ws";
import { propsMeta as RadioButtonFieldPropsMeta } from "./radio-button-field.ws";
import { propsMeta as RadioButtonPropsMeta } from "./radio-button.ws";
import { propsMeta as CheckboxFieldPropsMeta } from "./checkbox-field.ws";
import { propsMeta as CheckboxPropsMeta } from "./checkbox.ws";

// @todo this list should not be hardcoded!
export const defaultMetas: Record<string, WsComponentMeta> = {
  Slot: SlotMeta,
  Fragment: FragmentMeta,
  HtmlEmbed: HtmlEmbedMeta,
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
  CodeText: CodeTextMeta,
  Label: LabelMeta,
  SuccessMessage: SuccessMessageMeta,
  ErrorMessage: ErrorMessageMeta,
  Textarea: TextareaMeta,
  RadioButtonField: RadioButtonFieldMeta,
  RadioButton: RadioButtonMeta,
  CheckboxField: CheckboxFieldMeta,
  Checkbox: CheckboxMeta,
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
export const defaultPropsMetas: Record<string, WsComponentPropsMeta> = {
  Slot: SlotMetaPropsMeta,
  Fragment: FragmentMetaPropsMeta,
  HtmlEmbed: HtmlEmbedMetaPropsMeta,
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
  CodeText: CodeTextPropsMeta,
  Label: LabelPropsMeta,
  SuccessMessage: SuccessMessagePropsMeta,
  ErrorMessage: ErrorMessagePropsMeta,
  Textarea: TextareaPropsMeta,
  RadioButtonField: RadioButtonFieldPropsMeta,
  RadioButton: RadioButtonPropsMeta,
  CheckboxField: CheckboxFieldPropsMeta,
  Checkbox: CheckboxPropsMeta,
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
