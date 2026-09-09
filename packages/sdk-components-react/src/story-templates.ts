/**
 * Collects component templates for story generation without assigning component
 * identity through export names. The generator derives identity from each root.
 */
import { templates as basicTemplates } from "./basic.template";
import { meta as contentEmbed } from "./content-embed.template";
import { meta as markdownEmbed } from "./markdown-embed.template";
import { meta as form } from "./webhook-form.template";
import { meta as vimeo } from "./vimeo.template";
import { meta as youtube } from "./youtube.template";
import { meta as headSlot } from "./head-slot.template";
import { meta as select } from "./select.template";
import { meta as codeText } from "./code-text/template";

export const templates = [
  ...basicTemplates,
  { storyName: "ContentEmbed", meta: contentEmbed },
  { meta: markdownEmbed },
  { meta: form },
  { meta: vimeo },
  { meta: youtube },
  { meta: headSlot },
  { meta: select },
  { meta: codeText },
];
