import { dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import {
  findTags,
  getTextContent,
  loadHtmlIndices,
  parseHtml,
} from "./crawler";

// Crawl WHATWG HTML.

const html = await loadHtmlIndices();
const document = parseHtml(html);

type Element = {
  description: string;
  categories: string[];
  children: string[];
};

const elementsByTag: Record<string, Element> = {};

/**
 * scrape elements table with content model
 */
{
  const table = findTags(document, "table").find((table) => {
    const [caption] = findTags(table, "caption");
    return getTextContent(caption).toLowerCase().includes("list of elements");
  });
  const [tbody] = findTags(table, "tbody");
  const rows = findTags(tbody, "tr");
  const parseList = (text: string) => {
    return text
      .trim()
      .split(/\s*;\s*/)
      .map((item) => (item.endsWith("*") ? item.slice(0, -1) : item));
  };
  for (const row of rows) {
    const elements = getTextContent(row.childNodes[0])
      .trim()
      .split(/\s*,\s*/)
      .filter((tag) => {
        // skip "SVG svg" amd "MathML math"
        return !tag.includes(" ");
      });
    const description = getTextContent(row.childNodes[1]);
    let categories = parseList(getTextContent(row.childNodes[2])).map(
      (item) => {
        if (item === "heading") {
          // legend and summary refer to it as heading content
          return "heading content";
        }
        return item;
      }
    );
    let children = parseList(getTextContent(row.childNodes[4]));
    for (const tag of elements) {
      // textarea does not have value attribute and text content is used as initial value
      // introduce fake value attribute to manage initial state similar to input
      if (tag === "textarea") {
        children = [];
      }
      // move interactive category from details to summary
      // so details content could accept other interactive elements
      if (tag === "details") {
        categories = categories.filter((item) => item !== "interactive");
      }
      if (tag === "summary") {
        categories.push("interactive");
      }
      elementsByTag[tag] = {
        description,
        categories,
        children: children.includes("empty") ? [] : children,
      };
    }
  }
}

const contentModel = `type Element = {
  description: string;
  categories: string[];
  children: string[];
};

export const elementsByTag: Record<string, Element> = ${JSON.stringify(elementsByTag, null, 2)};
`;
const contentModelFile = "./src/__generated__/elements.ts";
await mkdir(dirname(contentModelFile), { recursive: true });
await writeFile(contentModelFile, contentModel);

const tags: string[] = [];
for (const [tag, element] of Object.entries(elementsByTag)) {
  if (element.categories.includes("metadata")) {
    continue;
  }
  tags.push(tag);
}
const getTagScore = (tag: string) => {
  if (tag === "div") {
    return 20;
  }
  if (tag === "span") {
    return 10;
  }
  return 0;
};
// put div and span first
tags.sort((left, right) => getTagScore(right) - getTagScore(left));
const tagsContent = `export const tags: string[] = ${JSON.stringify(tags, null, 2)};
`;
const tagsFile = "../sdk/src/__generated__/tags.ts";
await mkdir(dirname(tagsFile), { recursive: true });
await writeFile(tagsFile, tagsContent);
