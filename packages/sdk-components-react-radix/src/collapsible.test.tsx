import { renderTemplate } from "@webstudio-is/template";
import { expect, test } from "vitest";
import { propsCollapsibleContent } from "./__generated__/collapsible.props";
import { meta } from "./collapsible.template";

test("enables Force Mount for new Collapsible Content instances", () => {
  const fragment = renderTemplate(meta.template);
  const content = fragment.instances.find(
    ({ component }) =>
      component ===
      "@webstudio-is/sdk-components-react-radix:CollapsibleContent"
  );

  expect(content).toBeDefined();
  expect(
    fragment.props.find(
      ({ instanceId, name }) =>
        instanceId === content?.id && name === "forceMount"
    )
  ).toMatchObject({ type: "boolean", value: true });
  expect(propsCollapsibleContent.forceMount).toMatchObject({
    control: "boolean",
    type: "boolean",
  });
});
