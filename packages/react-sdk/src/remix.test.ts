import { expect, test } from "@jest/globals";
import { generateRemixParams, generateRemixRoute } from "./remix";

test("convert home page to remix route", () => {
  expect(generateRemixRoute("")).toEqual("_index.tsx");
  expect(generateRemixRoute("/")).toEqual("_index.tsx");
});

test("convert path to remix route", () => {
  expect(generateRemixRoute("/blog")).toEqual("[blog]._index.tsx");
  expect(generateRemixRoute("/blog/my-introduction")).toEqual(
    "[blog].[my-introduction]._index.tsx"
  );
});

test("convert wildcard to remix route", () => {
  expect(generateRemixRoute("/blog/*")).toEqual("[blog].$.tsx");
});

test("convert named group with * modifier to remix route", () => {
  expect(generateRemixRoute("/blog/:slug*")).toEqual("[blog].$.tsx");
});

test("convert named group with ? modifier to remix route", () => {
  expect(generateRemixRoute("/:id?/:slug?")).toEqual(
    "($id).($slug)._index.tsx"
  );
});

test("convert named groups to remix route", () => {
  expect(generateRemixRoute("/blog/:id/:date")).toEqual(
    "[blog].$id.$date._index.tsx"
  );
});

test("generate remix params for static pathname", () => {
  expect("\n" + generateRemixParams("/blog/my-post")).toEqual(`
export const getRemixParams = ({ ...params }: Params): Params => {
  return params
}
`);
});

test("generate remix params converter with wildcard", () => {
  expect("\n" + generateRemixParams("/blog/*")).toEqual(`
export const getRemixParams = ({ ...params }: Params): Params => {
  params[0] = params["*"]
  delete params["*"]
  return params
}
`);
});

test("generate remix params converter with named group and * modifier", () => {
  expect("\n" + generateRemixParams("/blog/:name*")).toEqual(`
export const getRemixParams = ({ ...params }: Params): Params => {
  params["name"] = params["*"]
  delete params["*"]
  return params
}
`);
});
