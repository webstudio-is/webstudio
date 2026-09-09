/** Verifies that registered component objects keep their persisted identities. */
import { expect, test } from "vitest";
import {
  CodeText,
  Label as BaseLabel,
} from "@webstudio-is/sdk-components-react/components";
import { canvasComponents } from "@webstudio-is/sdk-components-react/canvas-components";
import { Label as RadixLabel } from "@webstudio-is/sdk-components-react-radix";
import { VideoAnimation as PublicVideoAnimation } from "@webstudio-is/sdk-components-animation/components";
import { componentIds, componentsById } from "./components";

test("distinguishes component exports with the same display name", () => {
  expect(componentIds.get(BaseLabel)).toBe("Label");
  expect(componentIds.get(CodeText)).toBe("CodeText");
  expect(componentIds.get(canvasComponents.CodeText)).toBe("CodeText");
  expect(componentsById.get("CodeText")).toBe(canvasComponents.CodeText);
  expect(componentIds.get(RadixLabel)).toBe(
    "@webstudio-is/sdk-components-react-radix:Label"
  );
  expect(componentsById.get("Label")).toBe(BaseLabel);
  expect(componentIds.get(PublicVideoAnimation)).toBe(
    "@webstudio-is/sdk-components-animation:VideoAnimation"
  );
  expect(
    componentsById.get("@webstudio-is/sdk-components-react-radix:Label")
  ).toBe(RadixLabel);
});
