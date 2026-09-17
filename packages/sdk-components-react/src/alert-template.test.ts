import {
  renderTemplate,
  type TemplateComponent,
  type TemplateMeta,
} from "@webstudio-is/template";
import { expect, test } from "vitest";
import { MarkdownEmbed as MarkdownEmbedComponent } from "./components";
import { meta as MarkdownEmbed } from "./markdown-embed.template";

const componentIds = new Map<TemplateComponent, string>([
  [MarkdownEmbedComponent, "MarkdownEmbed"],
]);

const getVariantBackgroundStates = ({ template }: TemplateMeta) =>
  renderTemplate(template, undefined, [], { componentIds })
    .styles.filter(({ property }) => property === "backgroundColor")
    .map(({ state }) => state);

test("provides light backgrounds for every Markdown Embed alert variant", () => {
  expect(getVariantBackgroundStates(MarkdownEmbed)).toEqual([
    '[data-state="note"]',
    '[data-state="tip"]',
    '[data-state="important"]',
    '[data-state="warning"]',
    '[data-state="caution"]',
  ]);
});
