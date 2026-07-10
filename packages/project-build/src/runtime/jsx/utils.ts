import { webstudioJsxComponentNamespaces } from "./bindings";
import { getWebstudioJsxFragmentFirstElementName } from "./syntax";

export const isLikelyWebstudioJsxFragment = (source: string) => {
  try {
    const name = getWebstudioJsxFragmentFirstElementName(source);
    const namespace = name?.split(".").at(0);
    return (
      namespace !== undefined && webstudioJsxComponentNamespaces.has(namespace)
    );
  } catch {
    return false;
  }
};
