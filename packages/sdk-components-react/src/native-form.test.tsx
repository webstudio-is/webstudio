import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { NativeForm } from "./native-form";

test("renders native form attributes without managed submission behavior", () => {
  const html = renderToStaticMarkup(
    <NativeForm action="/contact" method="post" encType="multipart/form-data">
      <input name="message" />
      <button type="submit">Send</button>
    </NativeForm>
  );

  expect(html).toBe(
    '<form action="/contact" encType="multipart/form-data" method="post"><input name="message"/><button type="submit">Send</button></form>'
  );
});
