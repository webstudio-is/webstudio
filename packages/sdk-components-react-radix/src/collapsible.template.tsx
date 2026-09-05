import {
  $,
  css,
  PlaceholderValue,
  type TemplateMeta,
} from "@webstudio-is/template";
import { radix } from "./shared/proxy";
import { getButtonStyle } from "./shared/styles";

export const meta: TemplateMeta = {
  category: "radix",
  description:
    "An interactive component which expands and collapses some content, triggered by a button.",
  order: 5,
  template: (
    <radix.Collapsible>
      <radix.CollapsibleTrigger>
        <$.Button ws:style={getButtonStyle("outline")}>
          {new PlaceholderValue("Click to toggle content")}
        </$.Button>
      </radix.CollapsibleTrigger>
      <radix.CollapsibleContent
        forceMount={true}
        ws:style={css`
          overflow: hidden;
          &[data-state="closed"] {
            height: 0;
          }
          &[data-state="open"] {
            height: var(--radix-collapsible-content-height);
          }
        `}
      >
        <$.Text>{new PlaceholderValue("Collapsible Content")}</$.Text>
      </radix.CollapsibleContent>
    </radix.Collapsible>
  ),
};
