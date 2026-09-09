/** @jsxImportSource @webstudio-is/template */
import {
  css,
  PlaceholderValue,
  setInstanceMeta,
  type TemplateMeta,
} from "@webstudio-is/template";
import {
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
} from "./components";

const sampleImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23eef2ff'/%3E%3Cpath d='M96 264l120-120 88 88 56-56 184 184H96z' fill='%2394a3b8'/%3E%3Ccircle cx='456' cy='112' r='44' fill='%23f59e0b'/%3E%3C/svg%3E";

const BlockquoteTemplate: TemplateMeta = {
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

const BoldTemplate: TemplateMeta = {
  category: "typography",
  template: <Bold>{new PlaceholderValue("Critical update")}</Bold>,
};

const BoxTemplate: TemplateMeta = {
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

const ButtonTemplate: TemplateMeta = {
  category: "forms",
  template: <Button>{new PlaceholderValue("Save changes")}</Button>,
};

const CheckboxTemplate: TemplateMeta = {
  category: "forms",
  template: <Checkbox aria-label="Enable weekly summary" />,
};

const FragmentTemplate: TemplateMeta = {
  category: "general",
  template: (
    <Fragment>
      <Text>{new PlaceholderValue("Reusable fragment content")}</Text>
    </Fragment>
  ),
};

const HeadingTemplate: TemplateMeta = {
  category: "typography",
  template: (
    <Heading tag="h2">{new PlaceholderValue("Operational UI pattern")}</Heading>
  ),
};

const HtmlEmbedTemplate: TemplateMeta = {
  category: "media",
  template: (
    <HtmlEmbed code="<div style='padding:12px;border:1px dashed #94a3b8;border-radius:8px'>Embedded status widget</div>" />
  ),
};

const JsonLdTemplate: TemplateMeta = {
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

const ImageTemplate: TemplateMeta = {
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

const InputTemplate: TemplateMeta = {
  category: "forms",
  template: <Input name="workspace" placeholder="Workspace name" />,
};

const ItalicTemplate: TemplateMeta = {
  category: "typography",
  template: <Italic>{new PlaceholderValue("Draft state")}</Italic>,
};

const LabelTemplate: TemplateMeta = {
  category: "forms",
  template: <Label>{new PlaceholderValue("Workspace")}</Label>,
};

const LinkTemplate: TemplateMeta = {
  category: "general",
  template: (
    <Link href="#components">{new PlaceholderValue("View components")}</Link>
  ),
};

const ListTemplate: TemplateMeta = {
  category: "typography",
  template: (
    <List>
      <ListItem>{new PlaceholderValue("Triage incoming requests")}</ListItem>
      <ListItem>{new PlaceholderValue("Assign an owner")}</ListItem>
      <ListItem>{new PlaceholderValue("Resolve before SLA")}</ListItem>
    </List>
  ),
};

const ListItemTemplate: TemplateMeta = {
  category: "typography",
  template: <ListItem>{new PlaceholderValue("Review queue health")}</ListItem>,
};

const ParagraphTemplate: TemplateMeta = {
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

const RadioButtonTemplate: TemplateMeta = {
  category: "forms",
  template: (
    <RadioButton
      name="priority"
      value="standard"
      aria-label="Standard priority"
    />
  ),
};

const RemixFormTemplate: TemplateMeta = {
  category: "forms",
  template: (
    <RemixForm>
      <Label>{new PlaceholderValue("Search")}</Label>
      <Input name="query" placeholder="Find a ticket" />
      <Button>{new PlaceholderValue("Search")}</Button>
    </RemixForm>
  ),
};

const RichTextLinkTemplate: TemplateMeta = {
  category: "typography",
  template: (
    <RichTextLink href="#guidelines">
      {new PlaceholderValue("Read the usage guidelines")}
    </RichTextLink>
  ),
};

const SeparatorTemplate: TemplateMeta = {
  category: "general",
  template: <Separator />,
};

const SpanTemplate: TemplateMeta = {
  category: "typography",
  template: <Span>{new PlaceholderValue("Inline status")}</Span>,
};

const SubscriptTemplate: TemplateMeta = {
  category: "typography",
  template: <Subscript>{new PlaceholderValue("beta")}</Subscript>,
};

const SuperscriptTemplate: TemplateMeta = {
  category: "typography",
  template: <Superscript>{new PlaceholderValue("new")}</Superscript>,
};

const TextTemplate: TemplateMeta = {
  category: "typography",
  template: <Text>{new PlaceholderValue("System message")}</Text>,
};

const TextareaTemplate: TemplateMeta = {
  category: "forms",
  template: <Textarea name="notes" placeholder="Add handoff notes" />,
};

const TimeTemplate: TemplateMeta = {
  category: "typography",
  template: (
    <Time datetime="2026-07-06T09:00:00Z">
      {new PlaceholderValue("Jul 6, 2026, 09:00")}
    </Time>
  ),
};

const VideoTemplate: TemplateMeta = {
  category: "media",
  template: <Video controls aria-label="Workflow walkthrough video" />,
};

export const templates = [
  BlockquoteTemplate,
  BoldTemplate,
  BoxTemplate,
  ButtonTemplate,
  CheckboxTemplate,
  FragmentTemplate,
  HeadingTemplate,
  HtmlEmbedTemplate,
  ImageTemplate,
  InputTemplate,
  ItalicTemplate,
  JsonLdTemplate,
  LabelTemplate,
  LinkTemplate,
  ListTemplate,
  ListItemTemplate,
  ParagraphTemplate,
  RadioButtonTemplate,
  RemixFormTemplate,
  RichTextLinkTemplate,
  SeparatorTemplate,
  SpanTemplate,
  SubscriptTemplate,
  SuperscriptTemplate,
  TextTemplate,
  TextareaTemplate,
  TimeTemplate,
  VideoTemplate,
].map((meta) => ({ meta }));
