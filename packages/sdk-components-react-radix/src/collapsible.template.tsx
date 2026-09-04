import {
  $,
  css,
  PlaceholderValue,
  type TemplateMeta,
} from "@webstudio-is/template";
import { radix } from "./shared/proxy";
import { getButtonStyle } from "./shared/styles";

const { Button, Text } = $;
const { Collapsible, CollapsibleContent, CollapsibleTrigger } = radix;

export const meta: TemplateMeta = {
  category: "radix",
  description:
    "An interactive component which expands and collapses some content, triggered by a button.",
  order: 5,
  template: (
    <Collapsible>
      <CollapsibleTrigger>
        <Button ws:style={getButtonStyle("outline")}>
          {new PlaceholderValue("Click to toggle content")}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent
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
        <Text>{new PlaceholderValue("Collapsible Content")}</Text>
      </CollapsibleContent>
    </Collapsible>
  ),
};
