/* eslint-disable */
/* This is a auto generated file for building the project */

import { type ReactNode, useState } from "react";
import type { PageData } from "~/routes/_index";
import type { Asset } from "@webstudio-is/sdk";
import {
  Body as Body,
  Image as Image,
} from "@webstudio-is/sdk-components-react";

export const fontAssets: Asset[] = [];
export const pageData: PageData = {
  page: {
    id: "szYLvBduHPmbtqQKCDY0b",
    name: "RouteWithSymbols",
    title: "RouteWithSymbols",
    meta: { description: "" },
    rootInstanceId: "EDEfpMPRqDejthtwkH7ws",
    path: "/_route_with_symbols_",
  },
};
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "cddc1d44-af37-4cb6-a430-d300cf6f932d";

const Page = (props: { scripts?: ReactNode }) => {
  return (
    <Body data-ws-id="EDEfpMPRqDejthtwkH7ws" data-ws-component="Body">
      <Image
        data-ws-id="AdXSAYCx4QDo5QN6nLoGs"
        data-ws-component="Image"
        src={"/assets/small-avif-kitty_FnabJsioMWpBtXZSGf4DR.webp"}
      />
      {props.scripts}
    </Body>
  );
};

export { Page };

export const pagesPaths = new Set([
  "",
  "/radix",
  "/_route_with_symbols_",
  "/form",
  "/heading-with-id",
]);

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
