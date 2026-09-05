/** @jsxImportSource @webstudio-is/template */
import {
  css,
  PlaceholderValue,
  type TemplateMeta,
} from "@webstudio-is/template";
import { Button, Text } from "@webstudio-is/sdk-components-react/components";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components";
import { getButtonStyle } from "./shared/styles";

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
