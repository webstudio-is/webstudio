import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { WebhookForm } from "./webhook-form";

test("canvas success styling consumes redirect configuration without rendering a form attribute", () => {
  expect(
    renderToStaticMarkup(
      <WebhookForm
        successRedirect="/thanks"
        state="success"
        onStateChange={() => {}}
      >
        <p>Success message</p>
      </WebhookForm>
    )
  ).toBe("<form><p>Success message</p></form>");
});
