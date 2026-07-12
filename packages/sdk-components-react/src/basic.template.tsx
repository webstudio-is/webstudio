import {
  $,
  css,
  PlaceholderValue,
  type TemplateMeta,
} from "@webstudio-is/template";

const sampleImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23eef2ff'/%3E%3Cpath d='M96 264l120-120 88 88 56-56 184 184H96z' fill='%2394a3b8'/%3E%3Ccircle cx='456' cy='112' r='44' fill='%23f59e0b'/%3E%3C/svg%3E";

export const Blockquote: TemplateMeta = {
  category: "typography",
  description: "A quoted customer insight or design principle.",
  template: (
    <$.Blockquote>
      <$.Text>
        {
          new PlaceholderValue(
            "Operations teams need interfaces that make the next action obvious."
          )
        }
      </$.Text>
    </$.Blockquote>
  ),
};

export const Bold: TemplateMeta = {
  category: "typography",
  template: <$.Bold>{new PlaceholderValue("Critical update")}</$.Bold>,
};

export const Box: TemplateMeta = {
  category: "general",
  template: (
    <$.Box
      ws:label="Example Card"
      ws:style={css`
        padding: 16px;
        border: 1px solid #d4d4d8;
        border-radius: 8px;
      `}
    >
      <$.Text>{new PlaceholderValue("Component example container")}</$.Text>
    </$.Box>
  ),
};

export const Button: TemplateMeta = {
  category: "forms",
  template: <$.Button>{new PlaceholderValue("Save changes")}</$.Button>,
};

export const Checkbox: TemplateMeta = {
  category: "forms",
  template: <$.Checkbox aria-label="Enable weekly summary" />,
};

export const CodeText: TemplateMeta = {
  category: "typography",
  template: <$.CodeText>{new PlaceholderValue('status: "ready"')}</$.CodeText>,
};

export const Fragment: TemplateMeta = {
  category: "general",
  template: (
    <$.Fragment>
      <$.Text>{new PlaceholderValue("Reusable fragment content")}</$.Text>
    </$.Fragment>
  ),
};

export const Heading: TemplateMeta = {
  category: "typography",
  template: (
    <$.Heading tag="h2">
      {new PlaceholderValue("Operational UI pattern")}
    </$.Heading>
  ),
};

export const HtmlEmbed: TemplateMeta = {
  category: "media",
  template: (
    <$.HtmlEmbed code="<div style='padding:12px;border:1px dashed #94a3b8;border-radius:8px'>Embedded status widget</div>" />
  ),
};

export const JsonLd: TemplateMeta = {
  category: "general",
  order: 6,
  template: (
    <$.JsonLd
      code={JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Organization name",
      })}
    />
  ),
};

export const Image: TemplateMeta = {
  category: "media",
  template: (
    <$.Image
      src={sampleImage}
      alt="Abstract dashboard illustration"
      width={640}
      height={360}
    />
  ),
};

export const Input: TemplateMeta = {
  category: "forms",
  template: <$.Input name="workspace" placeholder="Workspace name" />,
};

export const Italic: TemplateMeta = {
  category: "typography",
  template: <$.Italic>{new PlaceholderValue("Draft state")}</$.Italic>,
};

export const Label: TemplateMeta = {
  category: "forms",
  template: <$.Label>{new PlaceholderValue("Workspace")}</$.Label>,
};

export const Link: TemplateMeta = {
  category: "general",
  template: (
    <$.Link href="#components">
      {new PlaceholderValue("View components")}
    </$.Link>
  ),
};

export const List: TemplateMeta = {
  category: "typography",
  template: (
    <$.List>
      <$.ListItem>
        {new PlaceholderValue("Triage incoming requests")}
      </$.ListItem>
      <$.ListItem>{new PlaceholderValue("Assign an owner")}</$.ListItem>
      <$.ListItem>{new PlaceholderValue("Resolve before SLA")}</$.ListItem>
    </$.List>
  ),
};

export const ListItem: TemplateMeta = {
  category: "typography",
  template: (
    <$.ListItem>{new PlaceholderValue("Review queue health")}</$.ListItem>
  ),
};

export const Paragraph: TemplateMeta = {
  category: "typography",
  template: (
    <$.Paragraph>
      {
        new PlaceholderValue(
          "Use these patterns to compose dense operational screens that stay readable under pressure."
        )
      }
    </$.Paragraph>
  ),
};

export const RadioButton: TemplateMeta = {
  category: "forms",
  template: (
    <$.RadioButton
      name="priority"
      value="standard"
      aria-label="Standard priority"
    />
  ),
};

export const RemixForm: TemplateMeta = {
  category: "forms",
  template: (
    <$.RemixForm>
      <$.Label>{new PlaceholderValue("Search")}</$.Label>
      <$.Input name="query" placeholder="Find a ticket" />
      <$.Button>{new PlaceholderValue("Search")}</$.Button>
    </$.RemixForm>
  ),
};

export const RichTextLink: TemplateMeta = {
  category: "typography",
  template: (
    <$.RichTextLink href="#guidelines">
      {new PlaceholderValue("Read the usage guidelines")}
    </$.RichTextLink>
  ),
};

export const Separator: TemplateMeta = {
  category: "general",
  template: <$.Separator />,
};

export const Span: TemplateMeta = {
  category: "typography",
  template: <$.Span>{new PlaceholderValue("Inline status")}</$.Span>,
};

export const Subscript: TemplateMeta = {
  category: "typography",
  template: <$.Subscript>{new PlaceholderValue("beta")}</$.Subscript>,
};

export const Superscript: TemplateMeta = {
  category: "typography",
  template: <$.Superscript>{new PlaceholderValue("new")}</$.Superscript>,
};

export const Text: TemplateMeta = {
  category: "typography",
  template: <$.Text>{new PlaceholderValue("System message")}</$.Text>,
};

export const Textarea: TemplateMeta = {
  category: "forms",
  template: <$.Textarea name="notes" placeholder="Add handoff notes" />,
};

export const Time: TemplateMeta = {
  category: "typography",
  template: (
    <$.Time datetime="2026-07-06T09:00:00Z">
      {new PlaceholderValue("Jul 6, 2026, 09:00")}
    </$.Time>
  ),
};

export const Video: TemplateMeta = {
  category: "media",
  template: <$.Video controls aria-label="Workflow walkthrough video" />,
};
