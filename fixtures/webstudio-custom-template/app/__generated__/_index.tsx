/* eslint-disable */
/* This is a auto generated file for building the project */

import type { PageData } from "~/routes/_index";
import type { Components } from "@webstudio-is/react-sdk";
import type { Asset } from "@webstudio-is/sdk";
import {
  Body as Body,
  Heading as Heading,
} from "@webstudio-is/sdk-components-react";

export const components = new Map(
  Object.entries({ Body: Body, Heading: Heading })
) as Components;
export const fontAssets: Asset[] = [];
export const pageData: PageData = {
  build: {
    props: [],
    instances: [
      [
        "ibXgMoi9_ipHx1gVrvii0",
        {
          type: "instance",
          id: "ibXgMoi9_ipHx1gVrvii0",
          component: "Body",
          children: [{ type: "id", value: "7pwqBSgrfuuOfk1JblWcL" }],
        },
      ],
      [
        "7pwqBSgrfuuOfk1JblWcL",
        {
          type: "instance",
          id: "7pwqBSgrfuuOfk1JblWcL",
          component: "Heading",
          children: [
            {
              type: "text",
              value: "DO NOT TOUCH THIS PROJECT, IT'S USED FOR FIXTURES",
            },
          ],
        },
      ],
    ],
    dataSources: [],
  },
  pages: [
    {
      id: "nfzls_SkTc9jKYyxcZ8Lw",
      name: "Home",
      title: "Home",
      meta: {
        description: "Page description f511c297-b44f-4e4b-96bd-d013da06bada",
      },
      rootInstanceId: "ibXgMoi9_ipHx1gVrvii0",
      path: "",
    },
  ],
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
  assets: [],
};
export const user: { email: string | null } | undefined = {
  email: "hello@webstudio.is",
};
export const projectId = "0d856812-61d8-4014-a20a-82e01c0eb8ee";

/* eslint-disable */

const indexesWithinAncestors = new Map<string, number>([]);

const getDataSourcesLogic = (
  _getVariable: (id: string) => unknown,
  _setVariable: (id: string, value: unknown) => void
) => {
  let _output = new Map();
  return _output;
};

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);

export const utils = {
  indexesWithinAncestors,
  getDataSourcesLogic,
};

/* eslint-enable */
