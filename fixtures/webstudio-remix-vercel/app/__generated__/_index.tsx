/* eslint-disable */
/* This is a auto generated file for building the project */

import { type ReactNode, useContext } from "react";
import { useStore } from "@nanostores/react";
import * as sdk from "@webstudio-is/react-sdk";
import type { PageData } from "~/routes/_index";
import { ReactSdkContext } from "@webstudio-is/react-sdk";
import type { Asset } from "@webstudio-is/sdk";
import {
  Body as Body,
  Heading as Heading,
  Box as Box,
  Paragraph as Paragraph,
  Image as Image,
} from "@webstudio-is/sdk-components-react";
import { Link as Link } from "@webstudio-is/sdk-components-react-remix";

export const fontAssets: Asset[] = [];
export const pageData: PageData = {
  build: {
    props: [
      [
        "rTRZFZEd03RBH4gUWj9LW",
        {
          id: "rTRZFZEd03RBH4gUWj9LW",
          instanceId: "pX1ovPI7NdC0HRjkw6Kpw",
          name: "src",
          type: "asset",
          value: "cd939c56-bcdd-4e64-bd9c-567a9bccd3da",
        },
      ],
      [
        "SYK4hpLQ9tHnESKDtPvI9",
        {
          id: "SYK4hpLQ9tHnESKDtPvI9",
          instanceId: "l9AI_pShC-BH4ibxK6kNT",
          name: "href",
          type: "string",
          value: "https://github.com/",
        },
      ],
    ],
    instances: [
      [
        "On9cvWCxr5rdZtY9O1Bv0",
        {
          type: "instance",
          id: "On9cvWCxr5rdZtY9O1Bv0",
          component: "Body",
          children: [
            { type: "id", value: "nVMWvMsaLCcb0o1wuNQgg" },
            { type: "id", value: "f0kF-WmL7DQg7MSyRvqY1" },
          ],
        },
      ],
      [
        "nVMWvMsaLCcb0o1wuNQgg",
        {
          type: "instance",
          id: "nVMWvMsaLCcb0o1wuNQgg",
          component: "Heading",
          children: [
            {
              type: "text",
              value: "DO NOT TOUCH THIS PROJECT, IT'S USED FOR FIXTURES",
            },
          ],
        },
      ],
      [
        "f0kF-WmL7DQg7MSyRvqY1",
        {
          type: "instance",
          id: "f0kF-WmL7DQg7MSyRvqY1",
          component: "Box",
          children: [
            { type: "id", value: "5XDbqPrZDeCwq4YJ3CHsc" },
            { type: "id", value: "qPnkiFGDj8dITWb1kmpGl" },
          ],
        },
      ],
      [
        "5XDbqPrZDeCwq4YJ3CHsc",
        {
          type: "instance",
          id: "5XDbqPrZDeCwq4YJ3CHsc",
          component: "Box",
          children: [
            { type: "id", value: "oLXYe1UQiVMhVnZGvJSMr" },
            { type: "id", value: "p34JHWcU6UNrd9FVnY80Q" },
            { type: "id", value: "l9AI_pShC-BH4ibxK6kNT" },
          ],
        },
      ],
      [
        "qPnkiFGDj8dITWb1kmpGl",
        {
          type: "instance",
          id: "qPnkiFGDj8dITWb1kmpGl",
          component: "Box",
          children: [{ type: "id", value: "pX1ovPI7NdC0HRjkw6Kpw" }],
        },
      ],
      [
        "oLXYe1UQiVMhVnZGvJSMr",
        {
          type: "instance",
          id: "oLXYe1UQiVMhVnZGvJSMr",
          component: "Heading",
          children: [{ type: "text", value: "Heading" }],
        },
      ],
      [
        "p34JHWcU6UNrd9FVnY80Q",
        {
          type: "instance",
          id: "p34JHWcU6UNrd9FVnY80Q",
          component: "Paragraph",
          children: [
            {
              type: "text",
              value:
                "a little kitten painted in black and white gouache with a thick brush",
            },
          ],
        },
      ],
      [
        "pX1ovPI7NdC0HRjkw6Kpw",
        {
          type: "instance",
          id: "pX1ovPI7NdC0HRjkw6Kpw",
          component: "Image",
          children: [],
        },
      ],
      [
        "l9AI_pShC-BH4ibxK6kNT",
        {
          type: "instance",
          id: "l9AI_pShC-BH4ibxK6kNT",
          component: "Link",
          children: [
            { type: "text", value: "Click here to adore more kittens" },
          ],
        },
      ],
    ],
    dataSources: [],
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
  ],
  page: {
    id: "7Db64ZXgYiRqKSQNR-qTQ",
    name: "Home",
    title: "Home",
    meta: {},
    rootInstanceId: "On9cvWCxr5rdZtY9O1Bv0",
    path: "",
  },
  assets: [
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

export const Page = (props: { scripts: ReactNode }) => {
  const {
    dataSourceValuesStore,
    setDataSourceValues,
    executeEffectfulExpression,
  } = useContext(ReactSdkContext);
  const dataSourceValues = useStore(dataSourceValuesStore);
  return (
    <Body data-ws-id="On9cvWCxr5rdZtY9O1Bv0" data-ws-component="Body">
      <Heading data-ws-id="nVMWvMsaLCcb0o1wuNQgg" data-ws-component="Heading">
        {"DO NOT TOUCH THIS PROJECT, IT'S USED FOR FIXTURES"}
      </Heading>
      <Box data-ws-id="f0kF-WmL7DQg7MSyRvqY1" data-ws-component="Box">
        <Box data-ws-id="5XDbqPrZDeCwq4YJ3CHsc" data-ws-component="Box">
          <Heading
            data-ws-id="oLXYe1UQiVMhVnZGvJSMr"
            data-ws-component="Heading"
          >
            {"Heading"}
          </Heading>
          <Paragraph
            data-ws-id="p34JHWcU6UNrd9FVnY80Q"
            data-ws-component="Paragraph"
          >
            {
              "a little kitten painted in black and white gouache with a thick brush"
            }
          </Paragraph>
          <Link
            data-ws-id="l9AI_pShC-BH4ibxK6kNT"
            data-ws-component="Link"
            href={"https://github.com/"}
          >
            {"Click here to adore more kittens"}
          </Link>
        </Box>
        <Box data-ws-id="qPnkiFGDj8dITWb1kmpGl" data-ws-component="Box">
          <Image data-ws-id="pX1ovPI7NdC0HRjkw6Kpw" data-ws-component="Image" />
        </Box>
      </Box>
      {props.scripts}
    </Body>
  );
};
