import { getFontFaces, type PartialFontAsset } from "./get-font-faces";

describe("getFontFaces()", () => {
  test("same family, but different formats", () => {
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
});
