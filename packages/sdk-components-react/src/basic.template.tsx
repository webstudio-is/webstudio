import {
  $,
  css,
  PlaceholderValue,
  setInstanceMeta,
  type TemplateMeta,
} from "@webstudio-is/template";

const {
  Blockquote,
  Bold,
  Box,
  Button,
  Checkbox,
  Fragment,
  Heading,
  HtmlEmbed,
  Image,
  Input,
  Italic,
  JsonLd,
  Label,
  Link,
  List,
  ListItem,
  Paragraph,
  RadioButton,
  RemixForm,
  RichTextLink,
  Separator,
  Span,
  Subscript,
  Superscript,
  Text,
  Textarea,
  Time,
  Video,
} = $;

const sampleImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23eef2ff'/%3E%3Cpath d='M96 264l120-120 88 88 56-56 184 184H96z' fill='%2394a3b8'/%3E%3Ccircle cx='456' cy='112' r='44' fill='%23f59e0b'/%3E%3C/svg%3E";

export const BlockquoteTemplate: TemplateMeta = {
  category: "typography",
  description: "A quoted customer insight or design principle.",
  template: (
    <Blockquote>
      <Text>
        {
          new PlaceholderValue(
            "Operations teams need interfaces that make the next action obvious."
          )
        }
      </Text>
    </Blockquote>
  ),
};

export const BoldTemplate: TemplateMeta = {
  category: "typography",
  template: <Bold>{new PlaceholderValue("Critical update")}</Bold>,
};

export const BoxTemplate: TemplateMeta = {
  category: "general",
  template: setInstanceMeta(
    { label: "Example Card" },
    <Box
      ws:style={css`
        padding: 16px;
        border: 1px solid #d4d4d8;
        border-radius: 8px;
      `}
    >
      <Text>{new PlaceholderValue("Component example container")}</Text>
    </Box>
  ),
};

export const ButtonTemplate: TemplateMeta = {
  category: "forms",
  template: <Button>{new PlaceholderValue("Save changes")}</Button>,
};

export const CheckboxTemplate: TemplateMeta = {
  category: "forms",
  template: <Checkbox aria-label="Enable weekly summary" />,
};

export const FragmentTemplate: TemplateMeta = {
  category: "general",
  template: (
    <Fragment>
      <Text>{new PlaceholderValue("Reusable fragment content")}</Text>
    </Fragment>
  ),
};

export const HeadingTemplate: TemplateMeta = {
  category: "typography",
  template: (
    <Heading tag="h2">{new PlaceholderValue("Operational UI pattern")}</Heading>
  ),
};

export const HtmlEmbedTemplate: TemplateMeta = {
  category: "media",
  template: (
    <HtmlEmbed code="<div style='padding:12px;border:1px dashed #94a3b8;border-radius:8px'>Embedded status widget</div>" />
  ),
};

export const JsonLdTemplate: TemplateMeta = {
  category: "general",
  order: 6,
  template: (
    <JsonLd
      code={JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Organization name",
      })}
    />
  ),
};

export const ImageTemplate: TemplateMeta = {
  category: "media",
  template: (
    <Image
      src={sampleImage}
      alt="Abstract dashboard illustration"
      width={640}
      height={360}
    />
  ),
};

export const InputTemplate: TemplateMeta = {
  category: "forms",
  template: <Input name="workspace" placeholder="Workspace name" />,
};

export const ItalicTemplate: TemplateMeta = {
  category: "typography",
  template: <Italic>{new PlaceholderValue("Draft state")}</Italic>,
};

export const LabelTemplate: TemplateMeta = {
  category: "forms",
  template: <Label>{new PlaceholderValue("Workspace")}</Label>,
};

export const LinkTemplate: TemplateMeta = {
  category: "general",
  template: (
    <Link href="#components">{new PlaceholderValue("View components")}</Link>
  ),
};

export const ListTemplate: TemplateMeta = {
  category: "typography",
  template: (
    <List>
      <ListItem>{new PlaceholderValue("Triage incoming requests")}</ListItem>
      <ListItem>{new PlaceholderValue("Assign an owner")}</ListItem>
      <ListItem>{new PlaceholderValue("Resolve before SLA")}</ListItem>
    </List>
  ),
};

export const ListItemTemplate: TemplateMeta = {
  category: "typography",
  template: <ListItem>{new PlaceholderValue("Review queue health")}</ListItem>,
};

export const ParagraphTemplate: TemplateMeta = {
  category: "typography",
  template: (
    <Paragraph>
      {
        new PlaceholderValue(
          "Use these patterns to compose dense operational screens that stay readable under pressure."
        )
      }
    </Paragraph>
  ),
};

export const RadioButtonTemplate: TemplateMeta = {
  category: "forms",
  template: (
    <RadioButton
      name="priority"
      value="standard"
      aria-label="Standard priority"
    />
  ),
};

export const RemixFormTemplate: TemplateMeta = {
  category: "forms",
  template: (
    <RemixForm>
      <Label>{new PlaceholderValue("Search")}</Label>
      <Input name="query" placeholder="Find a ticket" />
      <Button>{new PlaceholderValue("Search")}</Button>
    </RemixForm>
  ),
};

export const RichTextLinkTemplate: TemplateMeta = {
  category: "typography",
  template: (
    <RichTextLink href="#guidelines">
      {new PlaceholderValue("Read the usage guidelines")}
    </RichTextLink>
  ),
};

export const SeparatorTemplate: TemplateMeta = {
  category: "general",
  template: <Separator />,
};

export const SpanTemplate: TemplateMeta = {
  category: "typography",
  template: <Span>{new PlaceholderValue("Inline status")}</Span>,
};

export const SubscriptTemplate: TemplateMeta = {
  category: "typography",
  template: <Subscript>{new PlaceholderValue("beta")}</Subscript>,
};

export const SuperscriptTemplate: TemplateMeta = {
  category: "typography",
  template: <Superscript>{new PlaceholderValue("new")}</Superscript>,
};

export const TextTemplate: TemplateMeta = {
  category: "typography",
  template: <Text>{new PlaceholderValue("System message")}</Text>,
};

export const TextareaTemplate: TemplateMeta = {
  category: "forms",
  template: <Textarea name="notes" placeholder="Add handoff notes" />,
};

export const TimeTemplate: TemplateMeta = {
  category: "typography",
  template: (
    <Time datetime="2026-07-06T09:00:00Z">
      {new PlaceholderValue("Jul 6, 2026, 09:00")}
    </Time>
  ),
};

export const VideoTemplate: TemplateMeta = {
  category: "media",
  template: <Video controls aria-label="Workflow walkthrough video" />,
};
