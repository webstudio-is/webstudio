/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import type { Asset, ImageAsset, ProjectMeta } from "@webstudio-is/sdk";
import { useResource } from "@webstudio-is/react-sdk";
import type { PageMeta } from "@webstudio-is/react-sdk";
import { Body as Body } from "@webstudio-is/sdk-components-react-remix";
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

import type { PageData } from "~/routes/_index";
export const fontAssets: Asset[] = [];
export const imageAssets: ImageAsset[] = [
  {
    id: "88d5e2ff-b8f2-4899-aaf8-dde4ade6da10",
    name: "DALL_E_2023-10-30_12.39.46_-_Photo_logo_with_a_bold_cat_silhouette_centered_on_a_contrasting_background_designed_for_clarity_at_small_32x32_favicon_resolution_00h6cEA8u2pJRvVJv7hRe.png",
    description: null,
    projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
    size: 268326,
    type: "image",
    format: "png",
    createdAt: "2023-10-30T13:51:08.416Z",
    meta: { width: 790, height: 786 },
  },
  {
    id: "9a8bc926-7804-4d3f-af81-69196b1d2ed8",
    name: "small-avif-kitty_FnabJsioMWpBtXZSGf4DR.webp",
    description: null,
    projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
    size: 2906,
    type: "image",
    format: "webp",
    createdAt: "2023-09-12T09:44:22.120Z",
    meta: { width: 100, height: 100 },
  },
  {
    id: "cd939c56-bcdd-4e64-bd9c-567a9bccd3da",
    name: "_937084ed-a798-49fe-8664-df93a2af605e_uiBk3o6UWdqolyakMvQJ9.jpeg",
    description: null,
    projectId: "cddc1d44-af37-4cb6-a430-d300cf6f932d",
    size: 210614,
    type: "image",
    format: "jpeg",
    createdAt: "2023-09-06T11:28:43.031Z",
    meta: { width: 1024, height: 1024 },
  },
];
export const pageData: PageData = {
  project: {
    siteName: "KittyGuardedZone",
    faviconAssetId: "88d5e2ff-b8f2-4899-aaf8-dde4ade6da10",
    code: "<script>console.log('KittyGuardedZone')</script>\n",
  },
};
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

export const getPageMeta = ({
  params,
  resources,
}: {
  params: Record<string, undefined | string>;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "Radix Revelations: Unraveling the Feline Mystique",
    description:
      "Delve deep into the radix roots of feline behaviors. At KittyNoTouchy, we dissect the core essence, or 'radix', of what makes cats the enigmatic creatures they are. Join us as we explore the radix of their instincts, habits, and quirks.",
    excludePageFromSearch: true,
    socialImageAssetId: "88d5e2ff-b8f2-4899-aaf8-dde4ade6da10",
    socialImageUrl: undefined,
    status: undefined,
    redirect: undefined,
    custom: [],
  };
};

const Page = ({}: { params: any }) => {
  let [accordionValue, set$accordionValue] = useState<any>("0");
  return (
    <Body data-ws-id="uKWGyE9JY3cPwY-xI9vk6" data-ws-component="Body">
      <Accordion
        data-ws-id="AM9fD6dv2Ftc3Xjcsd7Uc"
        data-ws-component="@webstudio-is/sdk-components-react-radix:Accordion"
        collapsible={true}
        value={accordionValue}
        onValueChange={(value: any) => {
          accordionValue = value;
          set$accordionValue(accordionValue);
        }}
      >
        <AccordionItem
          data-ws-id="zJ927zk9txwUbYycKB7QA"
          data-ws-component="@webstudio-is/sdk-components-react-radix:AccordionItem"
          data-ws-index="0"
          className="c1lk4dyo cpa46rs c1rs4a6c"
        >
          <AccordionHeader
            data-ws-id="sMxg7xT1hwYt05hbOvoPL"
            data-ws-component="@webstudio-is/sdk-components-react-radix:AccordionHeader"
            className="ct8bqew"
          >
            <AccordionTrigger
              data-ws-id="qQSA4NoyKC88O68mBiQe2"
              data-ws-component="@webstudio-is/sdk-components-react-radix:AccordionTrigger"
              className="ct8bqew c4wr6vh c5exn1v c6th5p4 c8sklb9 cozm0zy crf2knr c16vf3pr c1u6bhyx cgivo88 c1px50mc cnog96r"
            >
              <Text data-ws-id="q-DVI4YTNrQ1LizmEyJHI" data-ws-component="Text">
                {"Is it accessible?"}
              </Text>
              <Box
                data-ws-id="RSk81lLj2IGXgchTuXF7V"
                data-ws-component="Box"
                className="c1chi4tu chkajpy cmhi6j0 c1bn66w8 cw6h46e c1mmsm3k c79adhm"
              >
                <HtmlEmbed
                  data-ws-id="d0sd_G-kHirxgjq6s6Uq1"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                  }
                />
              </Box>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent
            data-ws-id="IUftdfjK-ilSzfOTdIx1u"
            data-ws-component="@webstudio-is/sdk-components-react-radix:AccordionContent"
            className="c3kadi cl1n90y c11hmcmb c16vf3pr"
          >
            {"Yes. It adheres to the WAI-ARIA design pattern."}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem
          data-ws-id="C838wkvIcA1BQu30Xu2G8"
          data-ws-component="@webstudio-is/sdk-components-react-radix:AccordionItem"
          data-ws-index="1"
          className="c1lk4dyo cpa46rs c1rs4a6c"
        >
          <AccordionHeader
            data-ws-id="fYUOB_brm6s0Ky68lzMfU"
            data-ws-component="@webstudio-is/sdk-components-react-radix:AccordionHeader"
            className="ct8bqew"
          >
            <AccordionTrigger
              data-ws-id="dfd4gonev_AX6BpuCsxjb"
              data-ws-component="@webstudio-is/sdk-components-react-radix:AccordionTrigger"
              className="ct8bqew c4wr6vh c5exn1v c6th5p4 c8sklb9 cozm0zy crf2knr c16vf3pr c1u6bhyx cgivo88 c1px50mc cnog96r"
            >
              <Text data-ws-id="lZ7sI6Kw_0VZkURriKscB" data-ws-component="Text">
                {"Is it styled?"}
              </Text>
              <Box
                data-ws-id="wRw75kuvFzl5NWD8IGJoI"
                data-ws-component="Box"
                className="c1chi4tu chkajpy cmhi6j0 c1bn66w8 cw6h46e c1mmsm3k c79adhm"
              >
                <HtmlEmbed
                  data-ws-id="StPslEr81nfBISqBE2R-Y"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                  }
                />
              </Box>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent
            data-ws-id="wNRVuu0L5E8TVufKdswp1"
            data-ws-component="@webstudio-is/sdk-components-react-radix:AccordionContent"
            className="c3kadi cl1n90y c11hmcmb c16vf3pr"
          >
            {
              "Yes. It comes with default styles that matches the other components' aesthetic."
            }
          </AccordionContent>
        </AccordionItem>
        <AccordionItem
          data-ws-id="65djoTmSBGemZ2L5izQ5M"
          data-ws-component="@webstudio-is/sdk-components-react-radix:AccordionItem"
          data-ws-index="2"
          className="c1lk4dyo cpa46rs c1rs4a6c"
        >
          <AccordionHeader
            data-ws-id="UJYfe6kH7HqhH0YYeJwe7"
            data-ws-component="@webstudio-is/sdk-components-react-radix:AccordionHeader"
            className="ct8bqew"
          >
            <AccordionTrigger
              data-ws-id="600nGddaNxGGdsuGgpxJR"
              data-ws-component="@webstudio-is/sdk-components-react-radix:AccordionTrigger"
              className="ct8bqew c4wr6vh c5exn1v c6th5p4 c8sklb9 cozm0zy crf2knr c16vf3pr c1u6bhyx cgivo88 c1px50mc cnog96r"
            >
              <Text data-ws-id="1iNKIMG91n83PzJnEdxq9" data-ws-component="Text">
                {"Is it animated?"}
              </Text>
              <Box
                data-ws-id="Ta70VqUb_fGJXBT_zsnxQ"
                data-ws-component="Box"
                className="c1chi4tu chkajpy cmhi6j0 c1bn66w8 cw6h46e c1mmsm3k c79adhm"
              >
                <HtmlEmbed
                  data-ws-id="sO80m5u4f87jVGG91t6u8"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                  }
                />
              </Box>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent
            data-ws-id="mOVPnIrlt6IwVAzI_i2Fc"
            data-ws-component="@webstudio-is/sdk-components-react-radix:AccordionContent"
            className="c3kadi cl1n90y c11hmcmb c16vf3pr"
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

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const pagesPaths = new Set([
  "",
  "/radix",
  "/_route_with_symbols_",
  "/form",
  "/heading-with-id",
  "/resources",
  "/nested/nested-page",
]);

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
