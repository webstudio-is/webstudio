import { StyleSheet } from "./style-sheet";

describe("StyleSheet", () => {
  describe("basics", () => {
    test("rule with multiple properties", () => {
      const sheet = new StyleSheet();
      sheet.addRules([
        {
          style: {
            display: { type: "keyword", value: "block" },
            color: { type: "keyword", value: "red" },
          },
          breakpoint: "0",
        },
      ]);
      expect(sheet.toString()).toMatchInlineSnapshot(
        `".s0 { display: block; color: red }"`
      );
    });
  });
});
