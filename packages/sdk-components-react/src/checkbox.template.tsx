import { type TemplateMeta, $, PlaceholderValue } from "@webstudio-is/template";

export const meta: TemplateMeta = {
  category: "forms",
  description:
    "Use within a form to allow your users to toggle between checked and not checked. Group checkboxes by matching their “Name” properties. Unlike radios, any number of checkboxes in a group can be checked.",
  order: 6,
  template: (
    <$.Label ws:label="Checkbox Field">
      <$.Checkbox />
      <$.Text ws:label="Checkbox Label" tag="span">
        {new PlaceholderValue("Checkbox")}
      </$.Text>
    </$.Label>
  ),
};
