import { describe, test, expect } from "vitest";
import { getFontFaces, type PartialFontAsset } from "./get-font-faces";

describe("getFontFaces()", () => {
  test("sanitize url", () => {
    const assets: Array<PartialFontAsset> = [
      {
        format: "woff",
        meta: {
          family: "Roboto",
          style: "normal",
          weight: 400,
        },
        name: `robot"o.woff`,
      },
    ];
    expect(getFontFaces(assets, { assetBaseUrl: "/fonts/" }))
      .toMatchInlineSnapshot(`
[
  {
    "fontDisplay": "swap",
    "fontFamily": "Roboto",
    "fontStyle": "normal",
    "fontWeight": 400,
    "src": "url("/fonts/robot\\"o.woff") format("woff")",
  },
]
`);
  });

  test("different formats", () => {
    const assets: Array<PartialFontAsset> = [
      {
        format: "woff",
        meta: {
          family: "Roboto",
          style: "normal",
          weight: 400,
        },
        name: "roboto.woff",
      },
      {
        format: "ttf",
        meta: {
          family: "Roboto",
          style: "normal",
          weight: 400,
        },
        name: "roboto.ttf",
      },
    ];
    expect(getFontFaces(assets, { assetBaseUrl: "/fonts/" }))
      .toMatchInlineSnapshot(`
[
  {
    "fontDisplay": "swap",
    "fontFamily": "Roboto",
    "fontStyle": "normal",
    "fontWeight": 400,
    "src": "url("/fonts/roboto.woff") format("woff"), url("/fonts/roboto.ttf") format("truetype")",
  },
]
`);
  });

  test("deduplicates sources and chooses a deterministic winner per format", () => {
    const assets: Array<PartialFontAsset> = [
      {
        format: "ttf",
        meta: { family: "Roboto", style: "normal", weight: 400 },
        name: "roboto.ttf",
      },
      {
        format: "woff",
        meta: { family: "Roboto", style: "normal", weight: 400 },
        name: "a-roboto.woff",
      },
      {
        format: "woff",
        meta: { family: "Roboto", style: "normal", weight: 400 },
        name: "z-roboto.woff",
      },
      {
        format: "woff",
        meta: { family: "Roboto", style: "normal", weight: 400 },
        name: "a-roboto.woff",
      },
    ];

    expect(getFontFaces(assets, { assetBaseUrl: "/fonts/" })).toEqual([
      {
        fontDisplay: "swap",
        fontFamily: "Roboto",
        fontStyle: "normal",
        fontWeight: 400,
        src: 'url("/fonts/a-roboto.woff") format("woff"), url("/fonts/roboto.ttf") format("truetype")',
      },
    ]);
  });

  test("uses the file extension when an old asset has a stale format", () => {
    const assets: Array<PartialFontAsset> = [
      {
        format: "woff2",
        meta: { family: "Rajdhani", style: "normal", weight: 600 },
        name: "Rajdhani-SemiBold.ttf",
      },
    ];

    expect(getFontFaces(assets, { assetBaseUrl: "/fonts/" })[0]?.src).toBe(
      'url("/fonts/Rajdhani-SemiBold.ttf") format("truetype")'
    );
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
        name: "roboto.ttf",
      },
      {
        format: "ttf",
        meta: {
          family: "Roboto",
          style: "italic",
          weight: 400,
        },
        name: "roboto-italic.ttf",
      },
    ];
    expect(getFontFaces(assets, { assetBaseUrl: "/fonts/" }))
      .toMatchInlineSnapshot(`
[
  {
    "fontDisplay": "swap",
    "fontFamily": "Roboto",
    "fontStyle": "normal",
    "fontWeight": 400,
    "src": "url("/fonts/roboto.ttf") format("truetype")",
  },
  {
    "fontDisplay": "swap",
    "fontFamily": "Roboto",
    "fontStyle": "italic",
    "fontWeight": 400,
    "src": "url("/fonts/roboto-italic.ttf") format("truetype")",
  },
]
`);
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
        name: "roboto.ttf",
      },
      {
        format: "ttf",
        meta: {
          family: "Roboto",
          style: "normal",
          weight: 500,
        },
        name: "roboto-bold.ttf",
      },
    ];
    expect(getFontFaces(assets, { assetBaseUrl: "/fonts/" }))
      .toMatchInlineSnapshot(`
[
  {
    "fontDisplay": "swap",
    "fontFamily": "Roboto",
    "fontStyle": "normal",
    "fontWeight": 400,
    "src": "url("/fonts/roboto.ttf") format("truetype")",
  },
  {
    "fontDisplay": "swap",
    "fontFamily": "Roboto",
    "fontStyle": "normal",
    "fontWeight": 500,
    "src": "url("/fonts/roboto-bold.ttf") format("truetype")",
  },
]
`);
  });

  test("variable font", () => {
    const assets: Array<PartialFontAsset> = [
      {
        format: "ttf",
        meta: {
          family: "Inter",
          style: "normal",
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
        name: "inter.ttf",
      },
    ];
    expect(getFontFaces(assets, { assetBaseUrl: "/fonts/" }))
      .toMatchInlineSnapshot(`
[
  {
    "fontDisplay": "swap",
    "fontFamily": "Inter",
    "fontStretch": "25% 151%",
    "fontStyle": "normal",
    "fontWeight": "100 1000",
    "src": "url("/fonts/inter.ttf") format("truetype")",
  },
  {
    "fontDisplay": "swap",
    "fontFamily": "Inter",
    "fontStretch": "25% 151%",
    "fontStyle": "oblique",
    "fontWeight": "100 1000",
    "src": "url("/fonts/inter.ttf") format("truetype")",
  },
]
`);
  });

  test("keeps separate upright and italic variable font files", () => {
    const variationAxes = {
      wght: { name: "Weight", min: 100, default: 400, max: 900 },
      wdth: { name: "Width", min: 75, default: 100, max: 100 },
    };
    const assets: Array<PartialFontAsset> = [
      {
        format: "woff2",
        meta: { family: "Example", style: "normal", variationAxes },
        name: "example-normal.woff2",
      },
      {
        format: "woff2",
        meta: { family: "Example", style: "italic", variationAxes },
        name: "example-italic.woff2",
      },
    ];

    expect(getFontFaces(assets, { assetBaseUrl: "/fonts/" })).toEqual([
      {
        fontDisplay: "swap",
        fontFamily: "Example",
        fontStretch: "75% 100%",
        fontStyle: "normal",
        fontWeight: "100 900",
        src: 'url("/fonts/example-normal.woff2") format("woff2")',
      },
      {
        fontDisplay: "swap",
        fontFamily: "Example",
        fontStretch: "75% 100%",
        fontStyle: "italic",
        fontWeight: "100 900",
        src: 'url("/fonts/example-italic.woff2") format("woff2")',
      },
    ]);
  });

  test("registers variable ital and slant axes for matching styles", () => {
    const faces = getFontFaces(
      [
        {
          format: "woff2",
          meta: {
            family: "Flexible",
            style: "normal",
            variationAxes: {
              ital: { name: "Italic", min: 0, default: 0, max: 1 },
              slnt: { name: "Slant", min: -12, default: 0, max: 0 },
            },
          },
          name: "flexible.woff2",
        },
      ],
      { assetBaseUrl: "/fonts/" }
    );

    expect(faces.map(({ fontStyle }) => fontStyle)).toEqual([
      "normal",
      "italic",
      "oblique",
    ]);
  });
});
