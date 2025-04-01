import { dirname } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { findTags, getTextContent, parseHtml } from "./crawler";

// Crawl WHATWG HTML.

// prefer cached file to avoid too many requests on debug
const cachedFile = "./node_modules/.cache/html-spec-indices.html";
let text;
try {
  text = await readFile(cachedFile, "utf-8");
} catch {
  const response = await fetch(
    "https://html.spec.whatwg.org/multipage/indices.html"
  );
  text = await response.text();
  await writeFile(cachedFile, text);
}

const document = parseHtml(text);

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
      childrenCategoriesByTag[tag] = children;
    }
  }
}

let contentModel = ``;
contentModel += `export const categoriesByTag: Record<string, string[]> = ${JSON.stringify(categoriesByTag, null, 2)};\n`;
contentModel += `export const childrenCategoriesByTag: Record<string, string[]> = ${JSON.stringify(childrenCategoriesByTag, null, 2)};\n`;
const contentModelFile = "./src/__generated__/content-model.ts";
await mkdir(dirname(contentModelFile), { recursive: true });
await writeFile(contentModelFile, contentModel);
