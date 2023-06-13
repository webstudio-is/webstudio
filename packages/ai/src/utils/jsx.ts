import {
  parseJsx,
  type MitosisComponent,
  type MitosisNode,
} from "@builder.io/mitosis";
import type { PropsList } from "@webstudio-is/project-build";
import type { WsEmbedTemplate } from "@webstudio-is/react-sdk";

export const jsxToWSEmbedTemplate = (jsx: string) => {
  const parsed = parseJsx(
    `export default function App() {\n return ${jsx}\n}`,
    {
      typescript: false,
    }
  );

  return JSON.parse(
    mitosisJSONToWsEmbedTemplate()({ component: parsed })
  ) as WsEmbedTemplate;
};

type ProcessedValue = ReturnType<typeof processValue>;

function replacer<U>(key: string, value: U): ProcessedValue[];
function replacer(key: "children", value: MitosisNode[]): ProcessedValue[];
// eslint-disable-next-line func-style
function replacer(key: string, value: MitosisNode[]): ProcessedValue[] {
  if (key === "children" && Array.isArray(value)) {
    return value.map(processValue).filter((v) => v !== null);
  }

  if (key !== null && Array.isArray(value)) {
    return value.map((value) => processValue(value)).filter((v) => v !== null);
  }

  return value;
}

// @todo this is a Mitosis generator - add plugins hooks etc.
export const mitosisJSONToWsEmbedTemplate = function componentToWsEmbedTemplate(
  options = {}
) {
  return ({ component }: { component: MitosisComponent }) => {
    return JSON.stringify(component.children, replacer);
  };
};

const processValue = function processValue(value: MitosisNode) {
  if (typeof value?.properties?._text === "string") {
    const text = value.properties._text.trim();
    if (text.length === 0) {
      return null;
    }

    return {
      type: "text",
      value: text,
    };
  }

  const type = value["@type"];

  if (type === "@builder.io/mitosis/node") {
    const { class: className, ...props } = value.properties;
    return {
      type: "instance",
      component: value.name === "div" ? "Box" : value.name,
      props: getProps(props),
      styles:
        typeof className === "string"
          ? className.split(" ").map((name) => ({
              property: name,
              value: {
                type: "invalid",
                value: name,
              },
            }))
          : [],
      children: value.children || [],
    };
  }

  return value;
};

const getProps = function getProps(props: MitosisNode["properties"]) {
  const p: PropsList = [];
  Object.entries(props).forEach(([prop, value]) => {
    if (prop === "alt") {
      p.push({ type: "string", name: "alt", value });
    }
  });
  return p;
};
