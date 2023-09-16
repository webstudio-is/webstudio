/* eslint-disable */
/* This is a auto generated file for building the project */

import type { PageData } from "~/routes/_index";
import * as sdk from "@webstudio-is/react-sdk";
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
      meta: {},
      rootInstanceId: "ibXgMoi9_ipHx1gVrvii0",
      path: "",
    },
  ],
  page: {
    id: "nfzls_SkTc9jKYyxcZ8Lw",
    name: "Home",
    title: "Home",
    meta: {},
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

const rawExecuteComputingExpressions = (
  _variables: Map<string, unknown>
): Map<string, unknown> => {
  return new Map([]);
};
const executeComputingExpressions = (variables: Map<string, unknown>) => {
  const encodedvariables = sdk.encodeVariablesMap(variables);
  const encodedResult = rawExecuteComputingExpressions(encodedvariables);
  return sdk.decodeVariablesMap(encodedResult);
};

const generatedEffectfulExpressions = new Map<
  string,
  (args: Map<string, any>, variables: Map<string, any>) => Map<string, unknown>
>([]);

const rawExecuteEffectfulExpression = (
  code: string,
  args: Map<string, unknown>,
  variables: Map<string, unknown>
): Map<string, unknown> => {
  if (generatedEffectfulExpressions.has(code)) {
    return generatedEffectfulExpressions.get(code)!(args, variables);
  }
  console.error("Effectful expression not found", code);
  throw new Error("Effectful expression not found");
};

const executeEffectfulExpression = (
  code: string,
  args: Map<string, unknown>,
  variables: Map<string, unknown>
) => {
  const encodedvariables = sdk.encodeVariablesMap(variables);
  const encodedResult = rawExecuteEffectfulExpression(
    code,
    args,
    encodedvariables
  );
  return sdk.decodeVariablesMap(encodedResult);
};

export const utils = {
  indexesWithinAncestors,
  executeComputingExpressions,
  executeEffectfulExpression,
};

/* eslint-enable */
