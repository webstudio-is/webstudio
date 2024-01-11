/* eslint-disable */
/* This is a auto generated file for building the project */

import { type ReactNode, useState } from "react";
import type { PageData } from "~/routes/_index";
import type { Asset } from "@webstudio-is/sdk";
import {
  Body as Body,
  Heading as Heading,
} from "@webstudio-is/sdk-components-react";

export const fontAssets: Asset[] = [];
export const pageData: PageData = {
  page: {
    id: "nfzls_SkTc9jKYyxcZ8Lw",
    name: "Home",
    title: "Home",
    meta: {
      description: "Page description f511c297-b44f-4e4b-96bd-d013da06bada",
    },
    rootInstanceId: "ibXgMoi9_ipHx1gVrvii0",
    path: "",
  },
};
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "0d856812-61d8-4014-a20a-82e01c0eb8ee";

const Page = (props: { scripts?: ReactNode }) => {
  return (
    <Body data-ws-id="ibXgMoi9_ipHx1gVrvii0" data-ws-component="Body">
      <Heading data-ws-id="7pwqBSgrfuuOfk1JblWcL" data-ws-component="Heading">
        {"DO NOT TOUCH THIS PROJECT, IT'S USED FOR FIXTURES"}
      </Heading>
      {props.scripts}
    </Body>
  );
};

export { Page };

export const pagesPaths = new Set([""]);

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
