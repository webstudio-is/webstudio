/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import { useResource, useVariableState } from "@webstudio-is/react-sdk/runtime";
import { Body as Body } from "@webstudio-is/sdk-components-react-router";
import {
  Accordion as Accordion,
  AccordionItem as AccordionItem,
  AccordionHeader as AccordionHeader,
  AccordionTrigger as AccordionTrigger,
  AccordionContent as AccordionContent,
} from "@webstudio-is/sdk-components-react-radix";
import {
  Text as Text,
  Box as Box,
  HtmlEmbed as HtmlEmbed,
} from "@webstudio-is/sdk-components-react";

export const siteName = "KittyGuardedZone";

export const favIconAsset: string | undefined =
  "DALL_E_2023-10-30_12.39.46_-_Photo_logo_with_a_bold_cat_silhouette_centered_on_a_contrasting_background_designed_for_clarity_at_small_32x32_favicon_resolution_00h6cEA8u2pJRvVJv7hRe.png";

// Font assets on current page (can be preloaded)
export const pageFontAssets: string[] = [];

export const pageBackgroundImageAssets: string[] = [];

const Page = (_props: { system: any }) => {
  let [accordionValue, set$accordionValue] = useVariableState<any>("0");
  return (
    <Body className={`w-body`}>
      <Accordion
        collapsible={true}
        value={accordionValue}
        onValueChange={(value: any) => {
          accordionValue = value;
          set$accordionValue(accordionValue);
        }}
        className={`w-accordion`}
      >
        <AccordionItem data-ws-index="0" className={`w-item c2onvcp`}>
          <AccordionHeader className={`w-item-header c13v7j50`}>
            <AccordionTrigger
              className={`w-item-trigger c13v7j50 c1qxdkbn chhejm9 c13bviim cpjvam0 c1tw5o2 cqw88jp c44srea c14kxsax cg783j6 c1ad236a c1s4llbc`}
            >
              <Text className={`w-text`}>{"Is it accessible?"}</Text>
              <Box
                className={`w-box c14hansb c6d2sb5 cwwiftc c16vb2zi c1hl6g8z c1xm49r0 c1vri55v`}
              >
                <HtmlEmbed
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                  }
                  className={`w-html-embed`}
                />
              </Box>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent
            className={`w-item-content c1j0j9ep c1gl2i2 c44srea c1xcxvc0 c12ct49k`}
          >
            {"Yes. It adheres to the WAI-ARIA design pattern."}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem data-ws-index="1" className={`w-item c2onvcp`}>
          <AccordionHeader className={`w-item-header c13v7j50`}>
            <AccordionTrigger
              className={`w-item-trigger c13v7j50 c1qxdkbn chhejm9 c13bviim cpjvam0 c1tw5o2 cqw88jp c44srea c14kxsax cg783j6 c1ad236a c1s4llbc`}
            >
              <Text className={`w-text`}>{"Is it styled?"}</Text>
              <Box
                className={`w-box c14hansb c6d2sb5 cwwiftc c16vb2zi c1hl6g8z c1xm49r0 c1vri55v`}
              >
                <HtmlEmbed
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                  }
                  className={`w-html-embed`}
                />
              </Box>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent
            className={`w-item-content c1j0j9ep c1gl2i2 c44srea c1xcxvc0 c12ct49k`}
          >
            {
              "Yes. It comes with default styles that matches the other components' aesthetic."
            }
          </AccordionContent>
        </AccordionItem>
        <AccordionItem data-ws-index="2" className={`w-item c2onvcp`}>
          <AccordionHeader className={`w-item-header c13v7j50`}>
            <AccordionTrigger
              className={`w-item-trigger c13v7j50 c1qxdkbn chhejm9 c13bviim cpjvam0 c1tw5o2 cqw88jp c44srea c14kxsax cg783j6 c1ad236a c1s4llbc`}
            >
              <Text className={`w-text`}>{"Is it animated?"}</Text>
              <Box
                className={`w-box c14hansb c6d2sb5 cwwiftc c16vb2zi c1hl6g8z c1xm49r0 c1vri55v`}
              >
                <HtmlEmbed
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                  }
                  className={`w-html-embed`}
                />
              </Box>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent
            className={`w-item-content c1j0j9ep c1gl2i2 c44srea c1xcxvc0 c12ct49k`}
          >
            {
              "Yes. It's animated by default, but you can disable it if you prefer."
            }
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Body>
  );
};

export { Page };
