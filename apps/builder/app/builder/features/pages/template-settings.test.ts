import { describe, expect, test } from "vitest";
import { fieldDefaultValues } from "./page-settings/page-settings";
import { __testing__ } from "./template-settings";
import type { Values } from "./page-settings/shared";

const { getEditorCreatePageValues } = __testing__;

const createValues = (values: Partial<Values>): Values => ({
  ...fieldDefaultValues,
  ...values,
});

describe("template settings", () => {
  test("filters content mode page creation values without dropping custom metadata", () => {
    const initialValues = createValues({
      path: "/template",
      title: "boundTitle",
      description: `"Template description"`,
      excludePageFromSearch: "boundExclude",
      language: `"en-US"`,
      socialImageUrl: "boundSocialImageUrl",
      socialImageAssetId: "templateAsset",
      customMetas: [{ property: "og:type", content: "boundType" }],
    });
    const values = createValues({
      path: "/edited",
      name: "Edited",
      title: `"Edited title"`,
      description: `"Edited description"`,
      excludePageFromSearch: "false",
      language: `"fr-FR"`,
      socialImageUrl: `"https://example.com/image.png"`,
      socialImageAssetId: "editedAsset",
      customMetas: [{ property: "og:type", content: `"article"` }],
    });

    expect(getEditorCreatePageValues(initialValues, values)).toEqual({
      name: "Edited",
      path: "/edited",
      description: `"Edited description"`,
      language: `"fr-FR"`,
      customMetas: [{ property: "og:type", content: `"article"` }],
    });
  });

  test("does not allow editor page path override when initial path is invalid", () => {
    const editorValues = getEditorCreatePageValues(
      createValues({ path: "template" }),
      createValues({ path: "/edited" })
    );
    expect(editorValues.path).toBeUndefined();
    expect(editorValues).toMatchObject({
      name: "Untitled",
      customMetas: [{ property: "", content: `""` }],
    });
  });
});
