import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { NativeForm } from "./native-form";

test("Form suppresses native submission attributes", () => {
  const html = renderToStaticMarkup(
    <NativeForm action="/contact" method="post" encType="multipart/form-data">
      <input name="message" />
      <button type="submit">Send</button>
    </NativeForm>
  );

  expect(html).toContain('<form method="dialog">');
  expect(html).not.toContain("/contact");
  expect(html).not.toContain("multipart/form-data");
  expect(html).toContain('<input name="message"/>');
});

test("server rendering blocks an over-limit managed Form", () => {
  const html = renderToStaticMarkup(
    <NativeForm
      action="https://example.com/old-action"
      submission={{
        destinations: ["one", "two", "three", "four", "five", "six"],
      }}
    >
      <button type="submit">Send</button>
    </NativeForm>
  );
  expect(html).toContain('method="dialog"');
  expect(html).not.toContain("old-action");
  expect(html).toContain("Select no more than 5 Resource destinations");
});
