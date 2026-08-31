import { expect, test } from "vitest";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import * as metas from "./metas";

test("exposes only authored component content in Content mode", () => {
  const contentModeProps = Object.entries(metas).flatMap(
    ([component, meta]: [string, WsComponentMeta]) =>
      Object.entries(meta.props ?? {}).flatMap(([propName, propMeta]) =>
        propMeta.contentMode === true ? [`${component}.${propName}`] : []
      )
  );

  expect(contentModeProps.sort()).toEqual(
    [
      "Alert.variant",
      "Button.aria-label",
      "CodeText.language",
      "HtmlEmbed.code",
      "Image.alt",
      "Image.src",
      "Input.aria-label",
      "Input.placeholder",
      "JsonLd.code",
      "Link.download",
      "Link.href",
      "Link.target",
      "MarkdownEmbed.code",
      "Option.label",
      "RichTextLink.download",
      "RichTextLink.href",
      "RichTextLink.target",
      "Textarea.aria-label",
      "Textarea.placeholder",
      "Time.datetime",
      "Video.src",
      "Vimeo.url",
      "VimeoPreviewImage.src",
      "YouTube.url",
    ].sort()
  );
});
