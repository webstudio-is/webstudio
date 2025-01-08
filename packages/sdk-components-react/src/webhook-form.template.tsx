import {
  $,
  ActionValue,
  expression,
  PlaceholderValue,
  Variable,
  type TemplateMeta,
} from "@webstudio-is/template";

const formState = new Variable("formState", "initial");

export const meta: TemplateMeta = {
  category: "data",
  order: 1,
  description: "Collect user data and send it to any webhook.",
  template: (
    <$.Form
      state={expression`${formState}`}
      onStateChange={
        new ActionValue(["state"], expression`${formState} = state`)
      }
    >
      <$.Box
        ws:label="Form Content"
        ws:show={expression`${formState} === 'initial' || ${formState} === 'error'`}
      >
        <$.Label>{new PlaceholderValue("Name")}</$.Label>
        <$.Input name="name" />
        <$.Label>{new PlaceholderValue("Email")}</$.Label>
        <$.Input name="email" />
        <$.Button>{new PlaceholderValue("Submit")}</$.Button>
      </$.Box>
      <$.Box
        ws:label="Success Message"
        ws:show={expression`${formState} === 'success'`}
      >
        {new PlaceholderValue("Thank you for getting in touch!")}
      </$.Box>
      <$.Box
        ws:label="Error Message"
        ws:show={expression`${formState} === 'error'`}
      >
        {new PlaceholderValue("Sorry, something went wrong.")}
      </$.Box>
    </$.Form>
  ),
};
