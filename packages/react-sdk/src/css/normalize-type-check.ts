import * as normalize from "./normalize";
import type { htmlTags as HtmlTags } from "html-tags";
import type { Style } from "@webstudio-is/css-engine";

// no way I found to check exports https://github.com/microsoft/TypeScript/issues/38511
// we can check here that all exports represents a valid html tag
const normalizeWithKeyof = { ...normalize };

type ExportedTags = keyof typeof normalizeWithKeyof;
// Custom tags are needed because we need to be able to address
// elements like input `type="checkbox"` and HTML has historically terrible naming.
type CustomTags = "checkbox" | "radio";
type ExpectedTags = HtmlTags | CustomTags;

type ValidTags = ExportedTags extends ExpectedTags ? ExportedTags : false;

normalizeWithKeyof satisfies Record<ValidTags, Style>;
