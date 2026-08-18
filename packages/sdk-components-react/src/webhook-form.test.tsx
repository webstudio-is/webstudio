import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { WebhookForm } from "./webhook-form";

const onStateChange = () => {};

test("renders post method by default", () => {
  const markup = renderToStaticMarkup(
    <WebhookForm
      action="https://example.com/webhook"
      onStateChange={onStateChange}
    />
  );

  expect(markup).toContain('method="post"');
});

test("preserves an explicit method", () => {
  const markup = renderToStaticMarkup(
    <WebhookForm method="get" onStateChange={onStateChange} />
  );

  expect(markup).toContain('method="get"');
});
