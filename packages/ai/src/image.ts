import { createApi } from "unsplash-js";
import { traverseTemplateAsync } from "@webstudio-is/jsx-utils";
import type {
  EmbedTemplateProp,
  WsEmbedTemplate,
} from "@webstudio-is/react-sdk";

const queryImageAndMutateNode = async (
  api: ReturnType<typeof createApi>,
  node: WsEmbedTemplate[number]
) => {
  if (node.type === "instance" && node.component === "Image") {
    if (node.props === undefined) {
      return;
    }
    const src = node.props.find((prop) => prop.name === "src");
    // regenerate images when not specified, empty
    // or absolute url has wsai=true in search params
    let canRegenerate = src === undefined;
    if (src?.type === "string") {
      canRegenerate = src.value.trim() === "";
      try {
        canRegenerate = new URL(src.value).searchParams.get("wsai") === "true";
      } catch {
        // empty block
      }
    }
    const alt = node.props.find((prop) => prop.name === "alt");
    if (alt?.type === "string") {
      const photosSearchResult = await api.search.getPhotos({
        query: alt.value,
      });
      if (photosSearchResult.type === "success") {
        const [result] = photosSearchResult.response.results;
        const url = new URL(result.urls.raw);
        url.searchParams.set("wsai", "true");
        const src: EmbedTemplateProp = {
          name: "src",
          type: "string",
          value: url.href,
        };
        const srcIndex = node.props.findIndex((prop) => prop.name === "src");
        if (srcIndex === -1) {
          node.props.push(src);
        } else {
          node.props[srcIndex] = src;
        }
        const hasObjectFit = node.styles?.some(
          (styleDecl) => styleDecl.property === "objectFit"
        );
        if (hasObjectFit === false) {
          node.styles = node.styles ?? [];
          node.styles.push({
            property: "objectFit",
            value: { type: "keyword", value: "cover" },
          });
        }
      }
    }
  }
};

export const queryImagesAndMutateTemplate = async ({
  template,
  accessKey,
}: {
  template: WsEmbedTemplate;
  accessKey: string;
}) => {
  const api = createApi({
    accessKey,
  });
  await traverseTemplateAsync(template, async (node) => {
    await queryImageAndMutateNode(api, node);
  });
};
