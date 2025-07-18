import { dirname } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import {
  findByClasses,
  findByTags,
  getTextContent,
  loadHtmlIndices,
  loadSvgSinglePage,
  parseHtml,
} from "./crawler";

// Crawl WHATWG HTML.

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
  const html = await loadHtmlIndices();
  const document = parseHtml(html);

  const table = findByTags(document, "table").find((table) => {
    const [caption] = findByTags(table, "caption");
    return getTextContent(caption).toLowerCase().includes("list of elements");
  });
  const [tbody] = findByTags(table, "tbody");
  const rows = findByTags(tbody, "tr");
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
    categories.unshift("html-element");
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

{
  const svg = await loadSvgSinglePage();
  const document = parseHtml(svg);
  const summaries = findByClasses(document, "element-summary");
  for (const summary of summaries) {
    const [name] = findByClasses(summary, "element-summary-name").map((item) =>
      getTextContent(item).slice(1, -1)
    );
    const children: string[] = [];
    const [dl] = findByTags(summary, "dl");
    for (let index = 0; index < dl.childNodes.length; index += 1) {
      const child = dl.childNodes[index];
      if (getTextContent(child).toLowerCase().includes("content model")) {
        const dd = dl.childNodes[index + 1];
        for (const elementName of findByClasses(dd, "element-name")) {
          children.push(getTextContent(elementName).slice(1, -1));
        }
      }
    }
    if (elementsByTag[name]) {
      console.info(`${name} element from SVG specification is skipped`);
      continue;
    }
    const categories = name === "svg" ? ["flow", "phrasing"] : ["none"];
    categories.unshift("svg-element");
    elementsByTag[name] = {
      description: "",
      categories,
      children,
    };
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
