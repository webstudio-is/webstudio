import * as normalize from "./normalize";
import type { htmlTags as HtmlTags } from "html-tags";
import type { Style } from "@webstudio-is/css-data";

// no way I found to check exports https://github.com/microsoft/TypeScript/issues/38511
// we can check here that all exports represents a valid html tag
const normalizeWithKeyof = { ...normalize };

type ExportedTags = keyof typeof normalizeWithKeyof;

type ValidTags = ExportedTags extends HtmlTags ? ExportedTags : false;

normalizeWithKeyof satisfies Record<ValidTags, Style>;
