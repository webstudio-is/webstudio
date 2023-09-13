/* eslint-disable */
/* This is a auto generated file for building the project */

import type { PageData } from "~/routes/_index";
import type { Components } from "@webstudio-is/react-sdk";
import type { Asset } from "@webstudio-is/sdk";
import {
  Body as Body,
  Text as Text,
  Box as Box,
  HtmlEmbed as HtmlEmbed,
} from "@webstudio-is/sdk-components-react";
import {
  Accordion as Accordion,
  AccordionItem as AccordionItem,
  AccordionHeader as AccordionHeader,
  AccordionTrigger as AccordionTrigger,
  AccordionContent as AccordionContent,
} from "@webstudio-is/sdk-components-react-radix";

export const components = new Map(
  Object.entries({
    Body: Body,
    Text: Text,
    Box: Box,
    HtmlEmbed: HtmlEmbed,
    "@webstudio-is/sdk-components-react-radix:Accordion": Accordion,
    "@webstudio-is/sdk-components-react-radix:AccordionItem": AccordionItem,
    "@webstudio-is/sdk-components-react-radix:AccordionHeader": AccordionHeader,
    "@webstudio-is/sdk-components-react-radix:AccordionTrigger":
      AccordionTrigger,
    "@webstudio-is/sdk-components-react-radix:AccordionContent":
      AccordionContent,
  })
) as Components;
export const fontAssets: Asset[] = [];
export const pageData: PageData = {
  build: {
    props: [
      [
        "_x-dxwbTQ-XBLRuYQE9Pm",
        {
          id: "_x-dxwbTQ-XBLRuYQE9Pm",
          instanceId: "AM9fD6dv2Ftc3Xjcsd7Uc",
          name: "collapsible",
          type: "boolean",
          value: true,
        },
      ],
      [
        "XDeoQFsXw3NhVjns6I5HM",
        {
          id: "XDeoQFsXw3NhVjns6I5HM",
          instanceId: "AM9fD6dv2Ftc3Xjcsd7Uc",
          name: "value",
          type: "dataSource",
          value: "RR_FthRebEUcAKUJIXl0j",
        },
      ],
      [
        "UZg-1PcrNODgUo94IvnGC",
        {
          id: "UZg-1PcrNODgUo94IvnGC",
          instanceId: "AM9fD6dv2Ftc3Xjcsd7Uc",
          name: "onValueChange",
          type: "action",
          value: [
            {
              type: "execute",
              args: ["value"],
              code: "$ws$dataSource$RR_FthRebEUcAKUJIXl0j = value",
            },
          ],
        },
      ],
      [
        "XxpufvbtZ9iuhkPDDigde",
        {
          id: "XxpufvbtZ9iuhkPDDigde",
          instanceId: "d0sd_G-kHirxgjq6s6Uq1",
          name: "code",
          type: "string",
          value:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>',
        },
      ],
      [
        "d26zsuAR2XZt1RRN6oJXk",
        {
          id: "d26zsuAR2XZt1RRN6oJXk",
          instanceId: "StPslEr81nfBISqBE2R-Y",
          name: "code",
          type: "string",
          value:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>',
        },
      ],
      [
        "8Ar0H_oY5LOeyp2mMksps",
        {
          id: "8Ar0H_oY5LOeyp2mMksps",
          instanceId: "sO80m5u4f87jVGG91t6u8",
          name: "code",
          type: "string",
          value:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>',
        },
      ],
    ],
    instances: [
      [
        "uKWGyE9JY3cPwY-xI9vk6",
        {
          type: "instance",
          id: "uKWGyE9JY3cPwY-xI9vk6",
          component: "Body",
          children: [{ type: "id", value: "AM9fD6dv2Ftc3Xjcsd7Uc" }],
        },
      ],
      [
        "AM9fD6dv2Ftc3Xjcsd7Uc",
        {
          type: "instance",
          id: "AM9fD6dv2Ftc3Xjcsd7Uc",
          component: "@webstudio-is/sdk-components-react-radix:Accordion",
          children: [
            { type: "id", value: "zJ927zk9txwUbYycKB7QA" },
            { type: "id", value: "C838wkvIcA1BQu30Xu2G8" },
            { type: "id", value: "65djoTmSBGemZ2L5izQ5M" },
          ],
        },
      ],
      [
        "zJ927zk9txwUbYycKB7QA",
        {
          type: "instance",
          id: "zJ927zk9txwUbYycKB7QA",
          component: "@webstudio-is/sdk-components-react-radix:AccordionItem",
          children: [
            { type: "id", value: "sMxg7xT1hwYt05hbOvoPL" },
            { type: "id", value: "IUftdfjK-ilSzfOTdIx1u" },
          ],
        },
      ],
      [
        "sMxg7xT1hwYt05hbOvoPL",
        {
          type: "instance",
          id: "sMxg7xT1hwYt05hbOvoPL",
          component: "@webstudio-is/sdk-components-react-radix:AccordionHeader",
          children: [{ type: "id", value: "qQSA4NoyKC88O68mBiQe2" }],
        },
      ],
      [
        "qQSA4NoyKC88O68mBiQe2",
        {
          type: "instance",
          id: "qQSA4NoyKC88O68mBiQe2",
          component:
            "@webstudio-is/sdk-components-react-radix:AccordionTrigger",
          children: [
            { type: "id", value: "q-DVI4YTNrQ1LizmEyJHI" },
            { type: "id", value: "RSk81lLj2IGXgchTuXF7V" },
          ],
        },
      ],
      [
        "q-DVI4YTNrQ1LizmEyJHI",
        {
          type: "instance",
          id: "q-DVI4YTNrQ1LizmEyJHI",
          component: "Text",
          children: [{ type: "text", value: "Is it accessible?" }],
        },
      ],
      [
        "RSk81lLj2IGXgchTuXF7V",
        {
          type: "instance",
          id: "RSk81lLj2IGXgchTuXF7V",
          component: "Box",
          label: "Icon Container",
          children: [{ type: "id", value: "d0sd_G-kHirxgjq6s6Uq1" }],
        },
      ],
      [
        "d0sd_G-kHirxgjq6s6Uq1",
        {
          type: "instance",
          id: "d0sd_G-kHirxgjq6s6Uq1",
          component: "HtmlEmbed",
          label: "Chevron Icon",
          children: [],
        },
      ],
      [
        "IUftdfjK-ilSzfOTdIx1u",
        {
          type: "instance",
          id: "IUftdfjK-ilSzfOTdIx1u",
          component:
            "@webstudio-is/sdk-components-react-radix:AccordionContent",
          children: [
            {
              type: "text",
              value: "Yes. It adheres to the WAI-ARIA design pattern.",
            },
          ],
        },
      ],
      [
        "C838wkvIcA1BQu30Xu2G8",
        {
          type: "instance",
          id: "C838wkvIcA1BQu30Xu2G8",
          component: "@webstudio-is/sdk-components-react-radix:AccordionItem",
          children: [
            { type: "id", value: "fYUOB_brm6s0Ky68lzMfU" },
            { type: "id", value: "wNRVuu0L5E8TVufKdswp1" },
          ],
        },
      ],
      [
        "fYUOB_brm6s0Ky68lzMfU",
        {
          type: "instance",
          id: "fYUOB_brm6s0Ky68lzMfU",
          component: "@webstudio-is/sdk-components-react-radix:AccordionHeader",
          children: [{ type: "id", value: "dfd4gonev_AX6BpuCsxjb" }],
        },
      ],
      [
        "dfd4gonev_AX6BpuCsxjb",
        {
          type: "instance",
          id: "dfd4gonev_AX6BpuCsxjb",
          component:
            "@webstudio-is/sdk-components-react-radix:AccordionTrigger",
          children: [
            { type: "id", value: "lZ7sI6Kw_0VZkURriKscB" },
            { type: "id", value: "wRw75kuvFzl5NWD8IGJoI" },
          ],
        },
      ],
      [
        "lZ7sI6Kw_0VZkURriKscB",
        {
          type: "instance",
          id: "lZ7sI6Kw_0VZkURriKscB",
          component: "Text",
          children: [{ type: "text", value: "Is it styled?" }],
        },
      ],
      [
        "wRw75kuvFzl5NWD8IGJoI",
        {
          type: "instance",
          id: "wRw75kuvFzl5NWD8IGJoI",
          component: "Box",
          label: "Icon Container",
          children: [{ type: "id", value: "StPslEr81nfBISqBE2R-Y" }],
        },
      ],
      [
        "StPslEr81nfBISqBE2R-Y",
        {
          type: "instance",
          id: "StPslEr81nfBISqBE2R-Y",
          component: "HtmlEmbed",
          label: "Chevron Icon",
          children: [],
        },
      ],
      [
        "wNRVuu0L5E8TVufKdswp1",
        {
          type: "instance",
          id: "wNRVuu0L5E8TVufKdswp1",
          component:
            "@webstudio-is/sdk-components-react-radix:AccordionContent",
          children: [
            {
              type: "text",
              value:
                "Yes. It comes with default styles that matches the other components' aesthetic.",
            },
          ],
        },
      ],
      [
        "65djoTmSBGemZ2L5izQ5M",
        {
          type: "instance",
          id: "65djoTmSBGemZ2L5izQ5M",
          component: "@webstudio-is/sdk-components-react-radix:AccordionItem",
          children: [
            { type: "id", value: "UJYfe6kH7HqhH0YYeJwe7" },
            { type: "id", value: "mOVPnIrlt6IwVAzI_i2Fc" },
          ],
        },
      ],
      [
        "UJYfe6kH7HqhH0YYeJwe7",
        {
          type: "instance",
          id: "UJYfe6kH7HqhH0YYeJwe7",
          component: "@webstudio-is/sdk-components-react-radix:AccordionHeader",
          children: [{ type: "id", value: "600nGddaNxGGdsuGgpxJR" }],
        },
      ],
      [
        "600nGddaNxGGdsuGgpxJR",
        {
          type: "instance",
          id: "600nGddaNxGGdsuGgpxJR",
          component:
            "@webstudio-is/sdk-components-react-radix:AccordionTrigger",
          children: [
            { type: "id", value: "1iNKIMG91n83PzJnEdxq9" },
            { type: "id", value: "Ta70VqUb_fGJXBT_zsnxQ" },
          ],
        },
      ],
      [
        "1iNKIMG91n83PzJnEdxq9",
        {
          type: "instance",
          id: "1iNKIMG91n83PzJnEdxq9",
          component: "Text",
          children: [{ type: "text", value: "Is it animated?" }],
        },
      ],
      [
        "Ta70VqUb_fGJXBT_zsnxQ",
        {
          type: "instance",
          id: "Ta70VqUb_fGJXBT_zsnxQ",
          component: "Box",
          label: "Icon Container",
          children: [{ type: "id", value: "sO80m5u4f87jVGG91t6u8" }],
        },
      ],
      [
        "sO80m5u4f87jVGG91t6u8",
        {
          type: "instance",
          id: "sO80m5u4f87jVGG91t6u8",
          component: "HtmlEmbed",
          label: "Chevron Icon",
          children: [],
        },
      ],
      [
        "mOVPnIrlt6IwVAzI_i2Fc",
        {
          type: "instance",
          id: "mOVPnIrlt6IwVAzI_i2Fc",
          component:
            "@webstudio-is/sdk-components-react-radix:AccordionContent",
          children: [
            {
              type: "text",
              value:
                "Yes. It's animated by default, but you can disable it if you prefer.",
            },
          ],
        },
      ],
    ],
    dataSources: [
      [
        "RR_FthRebEUcAKUJIXl0j",
        {
          type: "variable",
          id: "RR_FthRebEUcAKUJIXl0j",
          scopeInstanceId: "AM9fD6dv2Ftc3Xjcsd7Uc",
          name: "accordionValue",
          value: { type: "string", value: "0" },
        },
      ],
    ],
  },
  pages: [
    {
      id: "7Db64ZXgYiRqKSQNR-qTQ",
      name: "Home",
      title: "Home",
      meta: {},
      rootInstanceId: "On9cvWCxr5rdZtY9O1Bv0",
      path: "",
    },
    {
      id: "xfvB4UThQXmQ_OubPYrkg",
      name: "radix",
      title: "radix",
      meta: { description: "" },
      rootInstanceId: "uKWGyE9JY3cPwY-xI9vk6",
      path: "/radix",
    },
    {
      id: "szYLvBduHPmbtqQKCDY0b",
      name: "RouteWithSymbols",
      title: "RouteWithSymbols",
      meta: { description: "" },
      rootInstanceId: "EDEfpMPRqDejthtwkH7ws",
      path: "/_route_with_symbols_",
    },
  ],
  page: {
    id: "xfvB4UThQXmQ_OubPYrkg",
    name: "radix",
    title: "radix",
    meta: { description: "" },
    rootInstanceId: "uKWGyE9JY3cPwY-xI9vk6",
    path: "/radix",
  },
  assets: [
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
  ],
};
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

/* eslint-disable */

const indexesWithinAncestors = new Map<string, number>([
  ["zJ927zk9txwUbYycKB7QA", 0],
  ["C838wkvIcA1BQu30Xu2G8", 1],
  ["65djoTmSBGemZ2L5izQ5M", 2],
]);

const getDataSourcesLogic = (
  _getVariable: (id: string) => unknown,
  _setVariable: (id: string, value: unknown) => void
) => {
  let accordionValue = _getVariable("RR_FthRebEUcAKUJIXl0j") ?? "0";
  let set$accordionValue = (value: unknown) =>
    _setVariable("RR_FthRebEUcAKUJIXl0j", value);
  let onValueChange = (value: any) => {
    accordionValue = value;
    set$accordionValue(accordionValue);
  };
  let _output = new Map();
  _output.set("RR_FthRebEUcAKUJIXl0j", accordionValue);
  _output.set("UZg-1PcrNODgUo94IvnGC", onValueChange);
  return _output;
};

export const utils = {
  indexesWithinAncestors,
  getDataSourcesLogic,
};

/* eslint-enable */
