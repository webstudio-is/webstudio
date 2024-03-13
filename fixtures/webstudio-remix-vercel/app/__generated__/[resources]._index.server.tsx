import { loadResource, type System } from "@webstudio-is/sdk";
export const loadResources = async (_props: { system: System }) => {
  const [list_1] = await Promise.all([
    loadResource({
      id: "1vX6SQdaCjJN6MvJlG_cQ",
      name: "list",
      url: "https://gist.githubusercontent.com/TrySound/56507c301ec85669db5f1541406a9259/raw/a49548730ab592c86b9e7781f5b29beec4765494/collection.json",
      method: "get",
      headers: [],
    }),
  ]);
  return {
    list_1,
  } as Record<string, unknown>;
};
