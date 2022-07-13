import { type Instance } from "@webstudio-is/sdk";
import { deleteCssRulesByBreakpoint } from "./delete-css-rules-by-breakpoint";

describe("Delete breakpoint", () => {
  test("basic", () => {
    const instance: Instance = {
      component: "Box",
      id: "1",
      cssRules: [{ breakpoint: "delete this", style: {} }],
      children: [
        {
          component: "Box",
          id: "2",
          cssRules: [{ breakpoint: "do not delete", style: {} }],
          children: [
            {
              component: "Box",
              id: "3",
              cssRules: [{ breakpoint: "delete this", style: {} }],
              children: [],
            },
          ],
        },
      ],
    };

    deleteCssRulesByBreakpoint(instance, "delete this");
    expect(instance).toMatchSnapshot();
  });
});
