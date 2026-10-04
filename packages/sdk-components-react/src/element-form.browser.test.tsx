import { expect, test } from "vitest";
import { createScope } from "@webstudio-is/sdk";
import { generateWebstudioComponent } from "@webstudio-is/react-sdk";
import {
  createTemplateComponentFixture,
  renderData,
  ws,
} from "@webstudio-is/template";

const Body = createTemplateComponentFixture("Body");

test("Element with tag=form keeps browser validation and HTML submission settings", async () => {
  const generated = generateWebstudioComponent({
    classesMap: new Map(),
    scope: createScope(),
    name: "Page",
    rootInstanceId: "body",
    parameters: [],
    metas: new Map(),
    ...renderData(
      <Body ws:id="body">
        <ws.element
          ws:tag="form"
          action="/submitted"
          method="post"
          enctype="multipart/form-data"
        >
          <ws.element ws:tag="input" name="email" type="email" required />
          <ws.element ws:tag="button" type="submit">
            Send
          </ws.element>
        </ws.element>
      </Body>
    ),
  });
  const generatedForm = generated.match(/<form\b[\s\S]*?<\/form>/)?.[0];
  if (!generatedForm) {
    throw new Error("Expected Element to generate a literal form");
  }
  expect(generated).not.toContain("<NativeForm");
  // These fixed JSX values map directly to HTML attributes and text. Load the
  // generator's form subtree into Chromium instead of authoring a second form.
  const html = generatedForm
    .replaceAll("encType=", "enctype=")
    .replace(/(\w+)=\{("[^"\\]*")\}/g, "$1=$2")
    .replace(/(\w+)=\{true\}/g, "$1")
    .replace(/\{("[^"\\]*")\}/g, (_match, value: string) => JSON.parse(value));
  expect(html).not.toMatch(/[{}]/);
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  try {
    await new Promise<void>((resolve) => {
      iframe.addEventListener("load", () => resolve(), { once: true });
      iframe.srcdoc = html;
    });
    const form = iframe.contentDocument?.querySelector("form");
    const input = iframe.contentDocument?.querySelector("input");
    const button = iframe.contentDocument?.querySelector("button");
    if (!form || !input || !button) {
      throw new Error("Expected the generated Element form and its controls");
    }
    expect(form.getAttribute("action")).toBe("/submitted");
    expect(form.method).toBe("post");
    expect(form.enctype).toBe("multipart/form-data");

    let submits = 0;
    form.addEventListener("submit", (event) => {
      submits += 1;
      event.preventDefault();
    });
    button.click();
    expect(submits).toBe(0);
    expect(input.matches(":invalid")).toBe(true);

    input.value = "person@example.com";
    button.click();
    expect(submits).toBe(1);
    expect(new FormData(form).get("email")).toBe("person@example.com");
  } finally {
    iframe.remove();
  }
});
