import { Button, Text } from "@webstudio-is/sdk-components-react/components";
import { renderTemplate, type TemplateComponent } from "@webstudio-is/template";
import { expect, test } from "vitest";
import { propsCollapsibleContent } from "./__generated__/collapsible.props";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components";
import { meta } from "./collapsible.template";
import { getRadixComponentId } from "./shared/component-id";

const componentIds = new Map<TemplateComponent, string>([
  [Button, "Button"],
  [Text, "Text"],
  [Collapsible, getRadixComponentId("Collapsible")],
  [CollapsibleTrigger, getRadixComponentId("CollapsibleTrigger")],
  [CollapsibleContent, getRadixComponentId("CollapsibleContent")],
]);

test("enables Force Mount for new Collapsible Content instances", () => {
  const fragment = renderTemplate(meta.template, undefined, [], {
    componentIds,
  });
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
