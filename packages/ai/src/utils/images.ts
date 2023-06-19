import type { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import { traverseTemplate } from "./traverse-template";

export const collectDescriptions = function collectDescriptions(
  template: WsEmbedTemplate
) {
  const imagesDescriptions: string[] = [];

  traverseTemplate(template, (node) => {
    if (node.type === "instance") {
      const description = node.props?.find(
        (prop) =>
          prop.name === "alt" &&
          typeof prop.value === "string" &&
          prop.value.trim()
      );
      if (description && description.type === "string") {
        imagesDescriptions.push(description.value);
      }
    }
  });

  return imagesDescriptions;
};

export const generateImagesUrls = async function generateImagesUrls(
  descriptions: string[]
): Promise<string[]> {
  return Promise.all(
    descriptions.map((desc) =>
      // TODO find an api to generate images
      fetch("https://api.openai.com/v1/images/generations", {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "OpenAI-Organization": config.organization,
        },
        body: JSON.stringify({
          prompt: desc,
          n: 1,
          size: "512x512",
          response_format: "url",
        }),
      })
        // fetch(`https://api.com/?query=${encodeURIComponent(desc)}`)
        .then((r) => r.json())
        .then((r) => r.data[0].url)
        .catch((e) => "")
    )
  );
};

export const insertImagesUrls = function insertImages(
  template: WsEmbedTemplate,
  descriptions: string[],
  imagesUrls: string[]
) {
  traverseTemplate(template, (node) => {
    if (node.type === "instance") {
      const description = node.props?.find(
        (prop) =>
          prop.name === "alt" &&
          typeof prop.value === "string" &&
          prop.value.trim()
      );
      if (description && description.type === "string") {
        const index = descriptions.indexOf(description.value);
        if (index > -1 && imagesUrls[index]) {
          node.props = node.props || [];
          node.props.push({
            type: "string",
            name: "src",
            value: imagesUrls[index],
          });
        }
      }
    }
  });
};
