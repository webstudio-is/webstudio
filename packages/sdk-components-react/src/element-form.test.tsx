import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { chromium } from "playwright";
import { expect, test } from "vitest";
import { createScope } from "@webstudio-is/sdk";
import { generateWebstudioComponent } from "@webstudio-is/react-sdk";
import {
  createTemplateComponentFixture,
  renderData,
  ws,
} from "@webstudio-is/template";

const Body = createTemplateComponentFixture("Body");

test("Element with tag=form submits with native validation, navigation, and encoding", async () => {
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
  // These fixed JSX values map directly to HTML attributes and text. Exercise
  // the generated form subtree instead of authoring a second form in the test.
  const html = generatedForm
    .replaceAll("encType=", "enctype=")
    .replace(/(\w+)=\{("[^"\\]*")\}/g, "$1=$2")
    .replace(/(\w+)=\{true\}/g, "$1")
    .replace(/\{("[^"\\]*")\}/g, (_match, value: string) => JSON.parse(value));
  expect(html).not.toMatch(/[{}]/);

  const submissions: { method: string; contentType: string; body: Buffer }[] =
    [];
  const server = createServer(async (request, response) => {
    if (request.url === "/submitted") {
      const chunks: Buffer[] = [];
      for await (const chunk of request) {
        chunks.push(Buffer.from(chunk));
      }
      submissions.push({
        method: request.method ?? "",
        contentType: request.headers["content-type"] ?? "",
        body: Buffer.concat(chunks),
      });
      response.setHeader("content-type", "text/html");
      response.end("<p id=received>Received</p>");
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end("<!doctype html><title>Form test</title>");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url);
    await page.setContent(html);
    expect(await page.locator("form").getAttribute("action")).toBe(
      "/submitted"
    );
    expect(await page.locator("form").getAttribute("method")).toBe("post");
    expect(await page.locator("form").getAttribute("enctype")).toBe(
      "multipart/form-data"
    );

    await page.getByRole("button", { name: "Send" }).click();
    expect(
      await page.locator("input").evaluate((input) => input.matches(":invalid"))
    ).toBe(true);
    expect(page.url()).toBe(`${url}/`);
    expect(submissions).toHaveLength(0);

    await page.locator("input").fill("person@example.com");
    await page.getByRole("button", { name: "Send" }).click();
    await page.getByText("Received").waitFor();
    expect(page.url()).toBe(`${url}/submitted`);
    expect(submissions).toHaveLength(1);
    expect(submissions[0].method).toBe("POST");
    expect(submissions[0].contentType).toMatch(
      /^multipart\/form-data; boundary=/
    );
    expect(submissions[0].body.toString()).toContain(
      'Content-Disposition: form-data; name="email"'
    );
    expect(submissions[0].body.toString()).toContain("person@example.com");
  } finally {
    await browser?.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
