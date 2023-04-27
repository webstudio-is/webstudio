import * as html from "./html";
import type { htmlTags as HtmlTags } from "html-tags";

type ExportedTags = keyof typeof html;

declare let exportedTags: ExportedTags;

exportedTags satisfies HtmlTags;
