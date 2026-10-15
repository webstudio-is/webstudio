import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Form } from "./resource-form";

test("Form exposes a valid action URL that identifies its mode", () => {
  const html = renderToStaticMarkup(
    <Form
      action={[{ dataSourceId: "request" }]}
      method="post"
      encType="multipart/form-data"
    >
      <input name="message" />
      <button type="submit">Send</button>
    </Form>
  );

  expect(html).toContain(
    '<form action="?__webstudio__=resources" method="dialog">'
  );
  expect(html).not.toContain("/contact");
  expect(html).not.toContain("multipart/form-data");
  expect(html).toContain('<input name="message"/>');
});

test("Form action URL identifies Navigation mode when no Resources are connected", () => {
  const html = renderToStaticMarkup(
    <Form action={[]}>
      <input name="query" />
    </Form>
  );
  expect(html).toContain(
    '<form action="?__webstudio__=navigate" method="get">'
  );
});

test("server rendering blocks an over-limit managed Form", () => {
  const html = renderToStaticMarkup(
    <Form
      action={[
        { dataSourceId: "one" },
        { dataSourceId: "two" },
        { dataSourceId: "three" },
        { dataSourceId: "four" },
        { dataSourceId: "five" },
        { dataSourceId: "six" },
      ]}
    >
      <button type="submit">Send</button>
    </Form>
  );
  expect(html).toContain('action="?__webstudio__=resources"');
  expect(html).toContain('method="dialog"');
  expect(html).toContain('<fieldset disabled="" style="display:contents">');
  expect(html).toContain('<button type="submit">Send</button>');
});
