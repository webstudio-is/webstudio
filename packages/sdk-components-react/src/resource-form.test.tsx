import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { ResourceForm } from "./resource-form";

test("ResourceForm exposes a valid action URL that identifies its mode", () => {
  const html = renderToStaticMarkup(
    <ResourceForm
      action={[{ dataSourceId: "request", enabled: true }]}
      method="post"
      encType="multipart/form-data"
    >
      <input name="message" />
      <button type="submit">Send</button>
    </ResourceForm>
  );

  expect(html).toContain(
    '<form action="?__webstudio__=resources" method="dialog">'
  );
  expect(html).not.toContain("/contact");
  expect(html).not.toContain("multipart/form-data");
  expect(html).toContain('<input name="message"/>');
});

test("ResourceForm action URL identifies Navigation mode when no Resources are connected", () => {
  const html = renderToStaticMarkup(
    <ResourceForm action={[]}>
      <input name="query" />
    </ResourceForm>
  );
  expect(html).toContain(
    '<form action="?__webstudio__=navigate" method="get">'
  );
});

test("server rendering blocks an over-limit managed Form", () => {
  const html = renderToStaticMarkup(
    <ResourceForm
      action={[
        { dataSourceId: "one", enabled: true },
        { dataSourceId: "two", enabled: true },
        { dataSourceId: "three", enabled: true },
        { dataSourceId: "four", enabled: true },
        { dataSourceId: "five", enabled: true },
        { dataSourceId: "six", enabled: true },
      ]}
    >
      <button type="submit">Send</button>
    </ResourceForm>
  );
  expect(html).toContain('action="?__webstudio__=resources"');
  expect(html).toContain('method="dialog"');
  expect(html).toContain('<fieldset disabled="" style="display:contents">');
  expect(html).toContain('<button type="submit">Send</button>');
});
