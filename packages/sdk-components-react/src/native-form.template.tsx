/** @jsxImportSource @webstudio-is/template */
import { PlaceholderValue, type TemplateMeta } from "@webstudio-is/template";
import { Button, Input, Label, NativeForm } from "./components";

export const meta: TemplateMeta = {
  category: "forms",
  description: "Collect information with a native HTML form.",
  template: (
    <NativeForm>
      <Label>
        {new PlaceholderValue("Name")}
        <Input name="name" autoComplete="name" required />
      </Label>
      <Label>
        {new PlaceholderValue("Email")}
        <Input name="email" type="email" autoComplete="email" required />
      </Label>
      <Button type="submit">{new PlaceholderValue("Submit")}</Button>
    </NativeForm>
  ),
};
