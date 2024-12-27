import { type TemplateMeta, $, PlaceholderValue } from "@webstudio-is/template";

export const meta: TemplateMeta = {
  category: "forms",
  description:
    "Use within a form to allow your users to select a single option from a set of mutually exclusive choices. Group multiple radios by matching their “Name” properties.",
  order: 5,
  template: (
    <$.Label ws:label="Radio Field">
      <$.RadioButton />
      <$.Text ws:label="Radio Label" tag="span">
        {new PlaceholderValue("Radio")}
      </$.Text>
    </$.Label>
  ),
};
