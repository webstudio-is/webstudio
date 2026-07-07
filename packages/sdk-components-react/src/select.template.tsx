import { $, css, type TemplateMeta } from "@webstudio-is/template";

export const meta: TemplateMeta = {
  category: "forms",
  description:
    "A drop-down menu for users to select a single option from a predefined list.",
  template: (
    <$.Select
      ws:style={css`
        display: block;
      `}
    >
      <$.Option label="Please choose an option" value="" />
      <$.Option label="Option A" value="a" />
      <$.Option label="Option B" value="b" />
      <$.Option label="Option C" value="c" />
    </$.Select>
  ),
};
