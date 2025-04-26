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
    const categories = parseList(getTextContent(row.childNodes[2]));
    const children = parseList(getTextContent(row.childNodes[4]));
    for (const tag of elements) {
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
