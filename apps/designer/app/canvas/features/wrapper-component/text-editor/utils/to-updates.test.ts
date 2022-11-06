import { toUpdates } from "./to-updates";

describe("toUpdates", () => {
  test("two lines of text", () => {
    const state = {
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: "a",
                type: "text",
                version: 1,
              },
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
          },
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: "b",
                type: "text",
                version: 1,
              },
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
    } as const;
    const updates = toUpdates(state.root);
    expect(updates).toStrictEqual(["a", "\n", "b"]);
  });

  test("text and instance", () => {
    const state = {
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: "a ",
                type: "text",
                version: 1,
              },
              {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: "b",
                type: "instance",
                version: 1,
                instance: {
                  component: "Bold",
                  id: "62bcc02160a439686c7eabde",
                  cssRules: [],
                  children: [],
                },
              },
              {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: "c",
                type: "text",
                version: 1,
              },
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
    } as const;

    const updates = toUpdates(state.root);
    expect(updates).toStrictEqual([
      "a ",
      {
        id: "62bcc02160a439686c7eabde",
        component: "Bold",
        text: "b",
      },
      "c",
    ]);
  });
});
