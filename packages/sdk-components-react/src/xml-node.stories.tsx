import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { StorySection } from "@webstudio-is/design-system";
import { XmlNode } from "./xml-node";

const Component = () => {
  return (
    <ReactSdkContext.Provider
      value={{
        renderer: "canvas",
        assetBaseUrl: "/",
        imageLoader: ({ src }) => src,
        resources: {},
        breakpoints: [],
        onError: console.error,
      }}
    >
      <XmlNode tag="root">
        <XmlNode tag="hello" rel="hihi" hreflang="joajoajoaja aokaoja aojaoj">
          Hi All Hi All Hi All Hi AllHi AllHi All Hi AllHi AllHi All
        </XmlNode>
        <XmlNode tag="hello" rel="hihi"></XmlNode>
      </XmlNode>
    </ReactSdkContext.Provider>
  );
};

export default {
  title: "XML node",
};

const Story = {
  render() {
    return (
      <StorySection title="Xml Node">
        <Component />
      </StorySection>
    );
  },
};

export { Story as XmlNode };
