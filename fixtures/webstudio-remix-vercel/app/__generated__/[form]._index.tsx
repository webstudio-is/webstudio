/* eslint-disable */
/* This is a auto generated file for building the project */

import { Fragment, useState } from "react";
import { useResource } from "@webstudio-is/react-sdk";
import {
  Body as Body,
  Form as Form,
} from "@webstudio-is/sdk-components-react-remix";
import {
  Box as Box,
  Label as Label,
  Input as Input,
  Button as Button,
  Heading as Heading,
} from "@webstudio-is/sdk-components-react";

const Page = ({}: { system: any }) => {
  let [formState, set$formState] = useState<any>("initial");
  let [formState_1, set$formState_1] = useState<any>("initial");
  return (
    <Body data-ws-id="a-4nDFkaWy4px1fn38XWJ" data-ws-component="Body">
      <Form
        data-ws-id="-1RvizaBcVpHsjvnYxn1c"
        data-ws-component="Form"
        state={formState}
        onStateChange={(state: any) => {
          formState = state;
          set$formState(formState);
        }}
      >
        {(formState === "initial" || formState === "error") && (
          <Box data-ws-id="qhnVrmYGlyrMZi3UzqSQA" data-ws-component="Box">
            <Heading
              data-ws-id="YdHHf4u3jrdbRIWpB_VfH"
              data-ws-component="Heading"
              tag={"h3"}
            >
              {"Default form"}
            </Heading>
            <Label data-ws-id="A0RNI1WVwOGGDbwYnoZia" data-ws-component="Label">
              {"Name"}
            </Label>
            <Input
              data-ws-id="e035xi9fcwYtrn9La49Eh"
              data-ws-component="Input"
              name={"name"}
            />
            <Label data-ws-id="LImtuVzw5R9yQsG4faiGV" data-ws-component="Label">
              {"Email"}
            </Label>
            <Input
              data-ws-id="dcHjdeW_HXPkyQlx3ZiL7"
              data-ws-component="Input"
              name={"email"}
            />
            <Button
              data-ws-id="ZAtG6JgK4sbTnOAZlp2rU"
              data-ws-component="Button"
            >
              {"Submit"}
            </Button>
          </Box>
        )}
        {formState === "success" && (
          <Box data-ws-id="966cjxuqP_T99N27-mqWE" data-ws-component="Box">
            {"Thank you for getting in touch!"}
          </Box>
        )}
        {formState === "error" && (
          <Box data-ws-id="SYG5hhOz31xFJUN_v9zq6" data-ws-component="Box">
            {"Sorry, something went wrong."}
          </Box>
        )}
      </Form>
      <Form
        data-ws-id="isNSM3wXcnHFikwNPlEOL"
        data-ws-component="Form"
        state={formState_1}
        onStateChange={(state: any) => {
          formState_1 = state;
          set$formState_1(formState_1);
        }}
        method={"get"}
        action={"/custom"}
      >
        {(formState_1 === "initial" || formState_1 === "error") && (
          <Box data-ws-id="a5YPRc19IJyhTrjjasA_R" data-ws-component="Box">
            <Heading
              data-ws-id="y4pceTmziuBRIDgUBQNLD"
              data-ws-component="Heading"
              tag={"h3"}
            >
              {"Form with custom action and method"}
            </Heading>
            <Label data-ws-id="_gLjS0enBOV8KW9Ykz_es" data-ws-component="Label">
              {"Name"}
            </Label>
            <Input
              data-ws-id="ydR5B_9uMS4PXFS76TmBh"
              data-ws-component="Input"
              name={"name"}
            />
            <Label data-ws-id="8RU1FyL2QRyqhNUKELGrb" data-ws-component="Label">
              {"Email"}
            </Label>
            <Input
              data-ws-id="TsqGP49hjgEW41ReCwrpZ"
              data-ws-component="Input"
              name={"email"}
            />
            <Button
              data-ws-id="5GWjwVdapuGdn443GIKDW"
              data-ws-component="Button"
            >
              {"Submit"}
            </Button>
          </Box>
        )}
        {formState_1 === "success" && (
          <Box data-ws-id="Gw-ta0R4FNFAGBTVRWKep" data-ws-component="Box">
            {"Thank you for getting in touch!"}
          </Box>
        )}
        {formState_1 === "error" && (
          <Box data-ws-id="ewk_WKpu4syHLPABMmvUz" data-ws-component="Box">
            {"Sorry, something went wrong."}
          </Box>
        )}
      </Form>
    </Body>
  );
};

export { Page };
