import {
  $,
  ws,
  ActionValue,
  css,
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
      <ws.element
        ws:tag="div"
        ws:label="Form Content"
        ws:show={expression`${formState} === 'initial' || ${formState} === 'error'`}
      >
        <ws.element
          ws:tag="label"
          ws:style={css`
            display: block;
          `}
        >
          {new PlaceholderValue("Name")}
        </ws.element>
        <ws.element
          ws:tag="input"
          ws:style={css`
            display: block;
          `}
          name="name"
        />
        <ws.element
          ws:tag="label"
          ws:style={css`
            display: block;
          `}
        >
          {new PlaceholderValue("Email")}
        </ws.element>
        <ws.element
          ws:tag="input"
          ws:style={css`
            display: block;
          `}
          name="email"
        />
        <ws.element ws:tag="button">
          {new PlaceholderValue("Submit")}
        </ws.element>
      </ws.element>
      <ws.element
        ws:tag="div"
        ws:label="Success Message"
        ws:show={expression`${formState} === 'success'`}
      >
        {new PlaceholderValue("Thank you for getting in touch!")}
      </ws.element>
      <ws.element
        ws:tag="div"
        ws:label="Error Message"
        ws:show={expression`${formState} === 'error'`}
      >
        {new PlaceholderValue("Sorry, something went wrong.")}
      </ws.element>
    </$.Form>
  ),
};
