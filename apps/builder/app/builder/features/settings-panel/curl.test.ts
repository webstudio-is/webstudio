import { expect, test } from "@jest/globals";
import { generateCurl, parseCurl, type CurlRequest } from "./curl";

test("support url", () => {
  const result = {
    url: "https://my-url/hello-world",
    method: "get",
    headers: [],
  };
  expect(parseCurl(`curl https://my-url/hello-world`)).toEqual(result);
  expect(parseCurl(`curl "https://my-url/hello-world"`)).toEqual(result);
  expect(parseCurl(`curl 'https://my-url/hello-world'`)).toEqual(result);
});

test("support multiline command with backslashes", () => {
  expect(
    parseCurl(`curl \\
      'https://my-url/hello-world'
  `)
  ).toEqual({
    url: "https://my-url/hello-world",
    method: "get",
    headers: [],
  });
});

test("skip when invalid", () => {
  expect(parseCurl(``)).toEqual(undefined);
  expect(parseCurl(`  `)).toEqual(undefined);
  expect(parseCurl(`something else`)).toEqual(undefined);
  expect(parseCurl(`curl`)).toEqual(undefined);
  expect(parseCurl(`curl `)).toEqual(undefined);
});

test("support method with --request and -X flags", () => {
  const result = {
    url: "https://my-url/hello-world",
    method: "post",
    headers: [],
  };
  expect(parseCurl(`curl --request post https://my-url/hello-world`)).toEqual(
    result
  );
  expect(parseCurl(`curl https://my-url/hello-world -X POST`)).toEqual(result);
  expect(
    parseCurl(`curl --request put https://my-url/hello-world -X post`)
  ).toEqual(result);
  expect(
    parseCurl(`curl -X put https://my-url/hello-world --request post`)
  ).toEqual(result);
});

test("support headers with --header and -H flags", () => {
  expect(
    parseCurl(`curl https://my-url/hello-world --header "name: value"`)
  ).toEqual({
    url: "https://my-url/hello-world",
    method: "get",
    headers: [{ name: "name", value: "value" }],
  });
  expect(parseCurl(`curl https://my-url/hello-world -H "name: value"`)).toEqual(
    {
      url: "https://my-url/hello-world",
      method: "get",
      headers: [{ name: "name", value: "value" }],
    }
  );
  expect(
    parseCurl(
      `curl https://my-url/hello-world --header="name:value1" -H "name : value2"`
    )
  ).toEqual({
    url: "https://my-url/hello-world",
    method: "get",
    headers: [
      { name: "name", value: "value1" },
      { name: "name", value: "value2" },
    ],
  });
});

test("support text body", () => {
  expect(
    parseCurl(`curl https://my-url/hello-world --data '{"param":"value"}'`)
  ).toEqual({
    url: "https://my-url/hello-world",
    method: "post",
    headers: [],
    body: `{"param":"value"}`,
  });
  expect(
    parseCurl(`curl https://my-url/hello-world -d '{"param":"value"}'`)
  ).toEqual({
    url: "https://my-url/hello-world",
    method: "post",
    headers: [],
    body: `{"param":"value"}`,
  });
});

test("support text body with explicit method", () => {
  expect(
    parseCurl(
      `curl https://my-url/hello-world -X put --data '{"param":"value"}'`
    )
  ).toEqual({
    url: "https://my-url/hello-world",
    method: "put",
    headers: [],
    body: `{"param":"value"}`,
  });
});

test("support json body", () => {
  expect(
    parseCurl(
      `curl https://my-url/hello-world --header 'content-type: application/json' --data '{"param":"value"}'`
    )
  ).toEqual({
    url: "https://my-url/hello-world",
    method: "post",
    headers: [{ name: "content-type", value: "application/json" }],
    body: { param: "value" },
  });
});

test("avoid failing on syntax error", () => {
  expect(parseCurl("curl \\")).toEqual(undefined);
});

test("generate curl with json body", () => {
  expect(
    generateCurl({
      url: "https://my-url.com",
      method: "post",
      headers: [{ name: "content-type", value: "application/json" }],
      body: { param: "value" },
    })
  ).toMatchInlineSnapshot(`
"curl "https://my-url.com" \\
  --request post \\
  --header "content-type: application/json" \\
  --data "{\\"param\\":\\"value\\"}""
`);
});

test("generate curl with text body", () => {
  expect(
    generateCurl({
      url: "https://my-url.com",
      method: "post",
      headers: [],
      body: "my data",
    })
  ).toMatchInlineSnapshot(`
"curl "https://my-url.com" \\
  --request post \\
  --data "my data""
`);
});

test("generate curl without body", () => {
  expect(
    generateCurl({
      url: "https://my-url.com",
      method: "post",
      headers: [],
    })
  ).toMatchInlineSnapshot(`
"curl "https://my-url.com" \\
  --request post"
`);
});

test("multiline graphql is idempotent", () => {
  const request: CurlRequest = {
    url: "https://eu-central-1-shared-euc1-02.cdn.hygraph.com/content/clorhpxi8qx7r01t6hfp1b5f6/master",
    method: "post",
    headers: [{ name: "Content-Type", value: "application/json" }],
    body: {
      query: `
        query Posts {
          posts {
            slug
            title
            updatedAt
            excerpt
          }
        }
      `,
    },
  };
  expect(parseCurl(generateCurl(request))).toEqual(request);
});
