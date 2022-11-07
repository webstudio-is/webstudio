import { getFontFaces, type PartialFontAsset } from "./get-font-faces";

describe("getFontFaces()", () => {
  test("different formats", () => {
    const assets: Array<PartialFontAsset> = [
      {
        format: "woff",
        meta: {
          family: "Roboto",
          style: "normal",
          weight: 400,
        },
        path: "/fonts/roboto.woff",
      },
      {
        format: "ttf",
        meta: {
          family: "Roboto",
          style: "normal",
          weight: 400,
        },
        path: "/fonts/roboto.ttf",
      },
    ];
    expect(getFontFaces(assets)).toMatchSnapshot();
  });

  test("different style", () => {
    const assets: Array<PartialFontAsset> = [
      {
        format: "ttf",
        meta: {
          family: "Roboto",
          style: "normal",
          weight: 400,
        },
        path: "/fonts/roboto.ttf",
      },
      {
        format: "ttf",
        meta: {
          family: "Roboto",
          style: "italic",
          weight: 400,
        },
        path: "/fonts/roboto-italic.ttf",
      },
    ];
    expect(getFontFaces(assets)).toMatchSnapshot();
  });

  test("different weight", () => {
    const assets: Array<PartialFontAsset> = [
      {
        format: "ttf",
        meta: {
          family: "Roboto",
          style: "normal",
          weight: 400,
        },
        path: "/fonts/roboto.ttf",
      },
      {
        format: "ttf",
        meta: {
          family: "Roboto",
          style: "normal",
          weight: 500,
        },
        path: "/fonts/roboto-bold.ttf",
      },
    ];
    expect(getFontFaces(assets)).toMatchSnapshot();
  });
});
