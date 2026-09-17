import {
  renderTemplate,
  type TemplateComponent,
  type TemplateMeta,
} from "@webstudio-is/template";
import { expect, test } from "vitest";
import { Alert } from "./basic.template";
import {
  Alert as AlertComponent,
  MarkdownEmbed as MarkdownEmbedComponent,
  Paragraph,
} from "./components";
import { meta as MarkdownEmbed } from "./markdown-embed.template";

const componentIds = new Map<TemplateComponent, string>([
  [AlertComponent, "Alert"],
  [MarkdownEmbedComponent, "MarkdownEmbed"],
  [Paragraph, "Paragraph"],
]);

const getVariantBackgroundStates = ({ template }: TemplateMeta) =>
  renderTemplate(template, undefined, [], { componentIds })
    .styles.filter(({ property }) => property === "backgroundColor")
    .map(({ state }) => state);

test.each([
  ["Alert", Alert],
  ["Markdown Embed alerts", MarkdownEmbed],
])("provides light backgrounds for every %s variant", (_name, template) => {
  expect(getVariantBackgroundStates(template)).toEqual([
    '[data-state="note"]',
    '[data-state="tip"]',
    '[data-state="important"]',
    '[data-state="warning"]',
    '[data-state="caution"]',
  ]);
});
