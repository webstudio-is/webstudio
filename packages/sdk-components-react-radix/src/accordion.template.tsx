import {
  $,
  css,
  PlaceholderValue,
  type TemplateMeta,
} from "@webstudio-is/template";
import { radix } from "./shared/proxy";
import {
  borderWidth,
  colors,
  fontSize,
  fontSizeLineHeight,
  height,
  spacing,
  transition,
  weights,
  width,
} from "./shared/theme";
import { ChevronDownIcon } from "@webstudio-is/icons/svg";

const createAccordionItem = (triggerText: string, contentText: string) => {
  return (
    <radix.AccordionItem
      // border-b
      ws:style={css`
        border-bottom: ${borderWidth.DEFAULT} solid ${colors.border};
      `}
    >
      <radix.AccordionHeader
        // flex
        ws:style={css`
          display: flex;
        `}
      >
        <radix.AccordionTrigger
          // flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180
          ws:style={css`
            display: flex;
            flex: 1 1 0;
            align-items: center;
            justify-content: between;
            padding: ${spacing[4]} 0;
            font-weight: ${weights.medium};
            --accordion-trigger-icon-transform: 0deg;
            &:hover {
              text-decoration-line: underline;
            }
            &[data-state="open"] {
              --accordion-trigger-icon-transform: 180deg;
            }
          `}
        >
          <$.Text>{new PlaceholderValue(triggerText)}</$.Text>
          <$.Box
            ws:label="Icon Container"
            // h-4 w-4 shrink-0 transition-transform duration-200
            ws:style={css`
              rotate: --accordion-trigger-icon-transform;
              height: ${height[4]};
              width: ${width[4]};
              flex-shrink: 0;
              transition: ${transition.all};
              transition-duration: 200ms;
            `}
          >
            <$.HtmlEmbed ws:label="Chevron Icon" code={ChevronDownIcon} />
          </$.Box>
        </radix.AccordionTrigger>
      </radix.AccordionHeader>
      <radix.AccordionContent
        // overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down
        // pb-4 pt-0
        ws:style={css`
          overflow: hidden;
          font-size: ${fontSize.sm};
          line-height: ${fontSizeLineHeight.sm};
          transition: ${transition.all};
          padding-bottom: ${spacing[4]};
        `}
      >
        {new PlaceholderValue(contentText)}
      </radix.AccordionContent>
    </radix.AccordionItem>
  );
};

/**
 * Styles source without animations:
 * https://github.com/shadcn-ui/ui/blob/main/apps/www/registry/default/ui/accordion.tsx
 *
 * Attributions
 * MIT License
 * Copyright (c) 2023 shadcn
 **/
export const meta: TemplateMeta = {
  category: "radix",
  description:
    "A vertically stacked set of interactive headings that each reveal an associated section of content. Clicking on the heading will open the item and close other items.",
  order: 3,
  template: (
    <radix.Accordion collapsible={true} defaultValue="0">
      {createAccordionItem(
        "Is it accessible?",
        "Yes. It adheres to the WAI-ARIA design pattern."
      )}
      {createAccordionItem(
        "Is it styled?",
        "Yes. It comes with default styles that matches the other components' aesthetic."
      )}
      {createAccordionItem(
        "Is it animated?",
        "Yes. It's animated by default, but you can disable it if you prefer."
      )}
    </radix.Accordion>
  ),
};
