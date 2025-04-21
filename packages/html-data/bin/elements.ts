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

const categoriesByTag: Record<string, string[]> = {};
const childrenCategoriesByTag: Record<string, string[]> = {};

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
    const categories = parseList(getTextContent(row.childNodes[2]));
    const children = parseList(getTextContent(row.childNodes[4]));
    for (const tag of elements) {
      categoriesByTag[tag] = categories;
      childrenCategoriesByTag[tag] = children.includes("empty") ? [] : children;
    }
  }
}

let contentModel = ``;
contentModel += `export const categoriesByTag: Record<string, string[]> = ${JSON.stringify(categoriesByTag, null, 2)};\n`;
contentModel += `export const childrenCategoriesByTag: Record<string, string[]> = ${JSON.stringify(childrenCategoriesByTag, null, 2)};\n`;
const contentModelFile = "./src/__generated__/content-model.ts";
await mkdir(dirname(contentModelFile), { recursive: true });
await writeFile(contentModelFile, contentModel);
