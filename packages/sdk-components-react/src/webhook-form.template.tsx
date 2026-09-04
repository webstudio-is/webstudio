import {
  $,
  ActionValue,
  css,
  expression,
  PlaceholderValue,
  setInstanceMeta,
  Variable,
  type TemplateMeta,
} from "@webstudio-is/template";
import type { ReactNode } from "react";
const { Form } = $;

const formState = new Variable("formState", "initial");

export const meta: TemplateMeta = {
  category: "data",
  order: 1,
  description: "Collect user data and send it to any webhook.",
  template: (
    <Form
      state={expression`${formState}`}
      onStateChange={
        new ActionValue(["state"], expression`${formState} = state`)
      }
    >
      {setInstanceMeta(
        { label: "Form Content" },
        <div
          ws:show={expression`${formState} === 'initial' || ${formState} === 'error'`}
        >
          <label
            ws:style={css`
              display: block;
            `}
          >
            {new PlaceholderValue("Name") as unknown as ReactNode}
          </label>
          <input
            ws:style={css`
              display: block;
            `}
            name="name"
          />
          <label
            ws:style={css`
              display: block;
            `}
          >
            {new PlaceholderValue("Email") as unknown as ReactNode}
          </label>
          <input
            ws:style={css`
              display: block;
            `}
            name="email"
          />
          <button>
            {new PlaceholderValue("Submit") as unknown as ReactNode}
          </button>
        </div>
      )}
      {setInstanceMeta(
        { label: "Success Message" },
        <div ws:show={expression`${formState} === 'success'`}>
          {
            new PlaceholderValue(
              "Thank you for getting in touch!"
            ) as unknown as ReactNode
          }
        </div>
      )}
      {setInstanceMeta(
        { label: "Error Message" },
        <div ws:show={expression`${formState} === 'error'`}>
          {
            new PlaceholderValue(
              "Sorry, something went wrong."
            ) as unknown as ReactNode
          }
        </div>
      )}
    </Form>
  ),
};
