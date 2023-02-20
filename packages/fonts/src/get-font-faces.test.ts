import { describe, test, expect } from "@jest/globals";
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

  test("variable font", () => {
    const assets: Array<PartialFontAsset> = [
      {
        format: "ttf",
        meta: {
          family: "Inter",
          variationAxes: {
            wght: { name: "wght", min: 100, default: 400, max: 1000 },
            wdth: { name: "wdth", min: 25, default: 100, max: 151 },
            opsz: { name: "opsz", min: 8, default: 14, max: 144 },
            GRAD: { name: "GRAD", min: -200, default: 0, max: 150 },
            slnt: { name: "slnt", min: -10, default: 0, max: 0 },
            XTRA: { name: "XTRA", min: 323, default: 468, max: 603 },
            XOPQ: { name: "XOPQ", min: 27, default: 96, max: 175 },
            YOPQ: { name: "YOPQ", min: 25, default: 79, max: 135 },
            YTLC: { name: "YTLC", min: 416, default: 514, max: 570 },
            YTUC: { name: "YTUC", min: 528, default: 712, max: 760 },
            YTAS: { name: "YTAS", min: 649, default: 750, max: 854 },
            YTDE: { name: "YTDE", min: -305, default: -203, max: -98 },
            YTFI: { name: "YTFI", min: 560, default: 738, max: 788 },
          },
        },
        path: "/fonts/inter.ttf",
      },
    ];
    expect(getFontFaces(assets)).toMatchSnapshot();
  });
});
