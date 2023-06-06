import { describe, expect, test } from "@jest/globals";

import { parseBackground } from "./background";

describe("parseBackground", () => {
  test("parse background from figma", () => {
    expect(
      parseBackground(
        "linear-gradient(180deg, #11181C 0%, rgba(17, 24, 28, 0) 36.09%), none, linear-gradient(180deg, rgba(230, 60, 254, 0.33) 0%, rgba(255, 174, 60, 0) 100%), radial-gradient(54.1% 95.83% at 100% 100%, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%), linear-gradient(122.33deg, rgba(74, 78, 250, 0.2) 0%, rgba(0, 0, 0, 0) 69.38%), radial-gradient(92.26% 201.29% at 98.6% 10.65%, rgba(255, 174, 60, 0.3) 0%, rgba(227, 53, 255, 0) 100%) /* warning: gradient uses a rotation that is not supported by CSS and may not behave as expected */, radial-gradient(84.64% 267.51% at 10.07% 81.45%, rgba(53, 255, 182, 0.2) 0%, rgba(74, 78, 250, 0.2) 100%) /* warning: gradient uses a rotation that is not supported by CSS and may not behave as expected */, #EBFFFC;"
      )
    ).toMatchInlineSnapshot(`
      {
        "backgroundColor": {
          "alpha": 1,
          "b": 252,
          "g": 255,
          "r": 235,
          "type": "rgb",
        },
        "backgroundImage": {
          "type": "layers",
          "value": [
            {
              "type": "unparsed",
              "value": "linear-gradient(180deg,#11181C 0%,rgba(17,24,28,0) 36.09%)",
            },
            {
              "type": "unparsed",
              "value": "linear-gradient(180deg,rgba(230,60,254,0.33) 0%,rgba(255,174,60,0) 100%)",
            },
            {
              "type": "unparsed",
              "value": "radial-gradient(54.1% 95.83%at 100% 100%,#FFFFFF 0%,rgba(255,255,255,0) 100%)",
            },
            {
              "type": "unparsed",
              "value": "linear-gradient(122.33deg,rgba(74,78,250,0.2) 0%,rgba(0,0,0,0) 69.38%)",
            },
            {
              "type": "unparsed",
              "value": "radial-gradient(92.26% 201.29%at 98.6% 10.65%,rgba(255,174,60,0.3) 0%,rgba(227,53,255,0) 100%)",
            },
            {
              "type": "unparsed",
              "value": "radial-gradient(84.64% 267.51%at 10.07% 81.45%,rgba(53,255,182,0.2) 0%,rgba(74,78,250,0.2) 100%)",
            },
          ],
        },
      }
    `);
  });

  test("parse background from figma without backgroundColor", () => {
    expect(
      parseBackground(
        "linear-gradient(180deg, #11181C 0%, rgba(17, 24, 28, 0) 36.09%), linear-gradient(180deg, rgba(230, 60, 254, 0.33) 0%, rgba(255, 174, 60, 0) 100%), radial-gradient(54.1% 95.83% at 100% 100%, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%), linear-gradient(122.33deg, rgba(74, 78, 250, 0.2) 0%, rgba(0, 0, 0, 0) 69.38%), radial-gradient(92.26% 201.29% at 98.6% 10.65%, rgba(255, 174, 60, 0.3) 0%, rgba(227, 53, 255, 0) 100%) /* warning: gradient uses a rotation that is not supported by CSS and may not behave as expected */, radial-gradient(84.64% 267.51% at 10.07% 81.45%, rgba(53, 255, 182, 0.2) 0%, rgba(74, 78, 250, 0.2) 100%) /* warning: gradient uses a rotation that is not supported by CSS and may not behave as expected */"
      )
    ).toMatchInlineSnapshot(`
      {
        "backgroundColor": undefined,
        "backgroundImage": {
          "type": "layers",
          "value": [
            {
              "type": "unparsed",
              "value": "linear-gradient(180deg,#11181C 0%,rgba(17,24,28,0) 36.09%)",
            },
            {
              "type": "unparsed",
              "value": "linear-gradient(180deg,rgba(230,60,254,0.33) 0%,rgba(255,174,60,0) 100%)",
            },
            {
              "type": "unparsed",
              "value": "radial-gradient(54.1% 95.83%at 100% 100%,#FFFFFF 0%,rgba(255,255,255,0) 100%)",
            },
            {
              "type": "unparsed",
              "value": "linear-gradient(122.33deg,rgba(74,78,250,0.2) 0%,rgba(0,0,0,0) 69.38%)",
            },
            {
              "type": "unparsed",
              "value": "radial-gradient(92.26% 201.29%at 98.6% 10.65%,rgba(255,174,60,0.3) 0%,rgba(227,53,255,0) 100%)",
            },
            {
              "type": "unparsed",
              "value": "radial-gradient(84.64% 267.51%at 10.07% 81.45%,rgba(53,255,182,0.2) 0%,rgba(74,78,250,0.2) 100%)",
            },
          ],
        },
      }
    `);
  });

  test("parse background and skips url background", () => {
    expect(
      parseBackground(
        "url(https://hello.world/some-image), linear-gradient(180deg, rgba(230, 60, 254, 0.33) 0%, rgba(255, 174, 60, 0) 100%), radial-gradient(54.1% 95.83% at 100% 100%, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%), linear-gradient(122.33deg, rgba(74, 78, 250, 0.2) 0%, rgba(0, 0, 0, 0) 69.38%), radial-gradient(92.26% 201.29% at 98.6% 10.65%, rgba(255, 174, 60, 0.3) 0%, rgba(227, 53, 255, 0) 100%) /* warning: gradient uses a rotation that is not supported by CSS and may not behave as expected */, radial-gradient(84.64% 267.51% at 10.07% 81.45%, rgba(53, 255, 182, 0.2) 0%, rgba(74, 78, 250, 0.2) 100%) /* warning: gradient uses a rotation that is not supported by CSS and may not behave as expected */"
      )
    ).toMatchInlineSnapshot(`
      {
        "backgroundColor": undefined,
        "backgroundImage": {
          "type": "layers",
          "value": [
            {
              "type": "unparsed",
              "value": "linear-gradient(180deg,rgba(230,60,254,0.33) 0%,rgba(255,174,60,0) 100%)",
            },
            {
              "type": "unparsed",
              "value": "radial-gradient(54.1% 95.83%at 100% 100%,#FFFFFF 0%,rgba(255,255,255,0) 100%)",
            },
            {
              "type": "unparsed",
              "value": "linear-gradient(122.33deg,rgba(74,78,250,0.2) 0%,rgba(0,0,0,0) 69.38%)",
            },
            {
              "type": "unparsed",
              "value": "radial-gradient(92.26% 201.29%at 98.6% 10.65%,rgba(255,174,60,0.3) 0%,rgba(227,53,255,0) 100%)",
            },
            {
              "type": "unparsed",
              "value": "radial-gradient(84.64% 267.51%at 10.07% 81.45%,rgba(53,255,182,0.2) 0%,rgba(74,78,250,0.2) 100%)",
            },
          ],
        },
      }
    `);
  });

  test("parse background partially copied background", () => {
    expect(
      parseBackground(
        "linear-gradient(180deg, #11181C 0%, rgba(17, 24, 28, 0) 36.09%), linear-gradient(180deg, "
      )
    ).toMatchInlineSnapshot(`
      {
        "backgroundColor": undefined,
        "backgroundImage": {
          "type": "layers",
          "value": [
            {
              "type": "unparsed",
              "value": "linear-gradient(180deg,#11181C 0%,rgba(17,24,28,0) 36.09%)",
            },
          ],
        },
      }
    `);
  });

  test("parse background partially commented", () => {
    expect(
      parseBackground(
        "linear-gradient(180deg, rgba(230, 60, 254, 0.33) 0%, rgba(255, 174, 60, 0) 100%), /* radial-gradient(54.1% 95.83% at 100% 100%, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%) */"
      )
    ).toMatchInlineSnapshot(`
      {
        "backgroundColor": undefined,
        "backgroundImage": {
          "type": "layers",
          "value": [
            {
              "type": "unparsed",
              "value": "linear-gradient(180deg,rgba(230,60,254,0.33) 0%,rgba(255,174,60,0) 100%)",
            },
          ],
        },
      }
    `);
  });

  test("parse bad background", () => {
    expect(parseBackground("linear-gradient(180deg,")).toMatchInlineSnapshot(`
      {
        "backgroundColor": undefined,
        "backgroundImage": {
          "type": "invalid",
          "value": "linear-gradient(180deg,)",
        },
      }
    `);
  });
});
