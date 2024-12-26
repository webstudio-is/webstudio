import { type TemplateMeta, $, PlaceholderValue } from "@webstudio-is/template";

export const meta: TemplateMeta = {
  category: "typography",
  description: "Groups content, like links in a menu or steps in a recipe.",
  order: 4,
  template: (
    <$.List>
      <$.ListItem>
        {new PlaceholderValue("List Item text you can edit")}
      </$.ListItem>
      <$.ListItem>
        {new PlaceholderValue("List Item text you can edit")}
      </$.ListItem>
      <$.ListItem>
        {new PlaceholderValue("List Item text you can edit")}
      </$.ListItem>
    </$.List>
  ),
};
