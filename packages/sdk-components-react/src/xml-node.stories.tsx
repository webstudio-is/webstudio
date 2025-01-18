import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { XmlNode } from "./xml-node";

const Component = () => {
  return (
    <ReactSdkContext.Provider
      value={{
        renderer: "canvas",
        assetBaseUrl: "/",
        imageLoader: ({ src }) => src,
        resources: {},
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
  title: "Components/XmlNode",
};

const Story = {
  render() {
    return (
      <>
        <Component />
      </>
    );
  },
};

export { Story as XmlNode };
