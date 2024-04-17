import { expect, test } from "@jest/globals";
import { generateRemixParams, generateRemixRoute } from "./remix";

test("convert home page to remix route", () => {
  expect(generateRemixRoute("")).toEqual("_index");
  expect(generateRemixRoute("/")).toEqual("_index");
});

test("convert path to remix route", () => {
  expect(generateRemixRoute("/blog")).toEqual("[blog]._index");
  expect(generateRemixRoute("/blog/my-introduction")).toEqual(
    "[blog].[my-introduction]._index"
  );
});

test("convert wildcard to remix route", () => {
  expect(generateRemixRoute("/blog/*")).toEqual("[blog].$");
});

test("convert named group with * modifier to remix route", () => {
  expect(generateRemixRoute("/blog/:slug*")).toEqual("[blog].$");
});

test("convert named group with ? modifier to remix route", () => {
  expect(generateRemixRoute("/:id?/:slug?")).toEqual("($id).($slug)._index");
});

test("convert named groups to remix route", () => {
  expect(generateRemixRoute("/blog/:id/:date")).toEqual(
    "[blog].$id.$date._index"
  );
});

test("generate remix params for static pathname", () => {
  expect("\n" + generateRemixParams("/blog/my-post")).toEqual(`
type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params
}
`);
});

test("generate remix params converter with wildcard", () => {
  expect("\n" + generateRemixParams("/blog/*")).toEqual(`
type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  params[0] = params["*"]
  delete params["*"]
  return params
}
`);
});

test("generate remix params converter with named group and * modifier", () => {
  expect("\n" + generateRemixParams("/blog/:name*")).toEqual(`
type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  params["name"] = params["*"]
  delete params["*"]
  return params
}
`);
});
