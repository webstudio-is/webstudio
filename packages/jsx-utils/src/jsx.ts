import * as parser from "@babel/parser";
import type { ParseError } from "@babel/parser";
import {
  type JSXElement,
  type JSXOpeningElement,
  type JSXText,
} from "@babel/types";
import {
  WsEmbedTemplate,
  type EmbedTemplateProp,
} from "@webstudio-is/react-sdk";
import JSON5 from "json5";
import type { JsonObject } from "type-fest";

export const jsxToWSEmbedTemplate = async (
  code: string
): Promise<WsEmbedTemplate> => {
  code = code.trim();

  let ast;

  try {
    ast = parser.parseExpression(code, {
      plugins: ["jsx"],
    });
  } catch (error) {
    if (
      error &&
      (error as ParseError).reasonCode === "UnwrappedAdjacentJSXElements"
    ) {
      code = `<Fragment>${code}</Fragment>`;
      ast = parser.parseExpression(code, {
        plugins: ["jsx"],
      });
    }
  }

  if (ast && ast.type === "JSXElement") {
    const template = await transform(ast, code);
    if (template !== null) {
      // Validate template
      WsEmbedTemplate.parse([template]);
      return [template];
    }
  }

  throw new Error("JSX to Webstudio Embed Template produced an empty result");
};

const ignoredProps = new Set(["style"]);

const transform = async (
  node: JSXElement | JSXText,
  code: string
): Promise<WsEmbedTemplate[number] | null> => {
  if (node.type === "JSXText") {
    // text nodes.
    const value = node.value.trim();
    if (value === "") {
      return null;
    }
    return {
      type: "text",
      value,
    };
  }

  if (node.type === "JSXElement") {
    const element = node.openingElement;

    // @todo Parse inline styles.
    // const styles = getProps(code, element.attributes, ["style"]);

    const props = parseProps(
      getProps(code, element.attributes).filter(
        (prop) => ignoredProps.has(prop.name) === false
      )
    );

    return {
      type: "instance",
      component: getComponentName(element.name),
      styles: [],
      props,
      children: (
        await Promise.all(
          node.children.map((child) => {
            if (child.type === "JSXElement" || child.type === "JSXText") {
              return transform(child, code);
            }
            return null;
          })
        )
      ).filter((child) => child !== null) as WsEmbedTemplate,
    };
  }

  return null;
};

const getComponentName = (element: JSXOpeningElement["name"]): string => {
  if (element.type === "JSXIdentifier") {
    return element.name;
  }
  if (element.type === "JSXMemberExpression") {
    return `${getComponentName(element.object)}.${element.property.name}`;
  }
  return "Box";
};

type JsonProp = {
  name: string;
  value: string | JsonObject;
};

const getProps = function getProps(
  code: string,
  attributes: JSXOpeningElement["attributes"],
  pickProps?: string[]
) {
  return attributes
    .map((attr) => {
      if (
        attr.type === "JSXAttribute" &&
        attr.name.type === "JSXIdentifier" &&
        attr.value !== null &&
        attr.value !== undefined &&
        typeof attr.value.start === "number" &&
        typeof attr.value.end === "number" &&
        (pickProps === undefined || pickProps.includes(attr.name.name))
      ) {
        const name = attr.name.name;

        // @todo #2398 Replace the parsing logic below with advanced parsing to include and return a EmbedTemplateProp instead.

        let value: string | JsonObject = code.slice(
          attr.value.start + 1,
          attr.value.end - 1
        );

        try {
          const parsed: JsonObject = JSON5.parse(value);
          if (parsed) {
            value = parsed;
          }
        } catch (error) {
          /**/
        }

        return {
          name,
          value,
        };
      }
      return null;
    })
    .filter((attr) => attr !== null) as JsonProp[];
};

const parseProps = function parseProps(props: JsonProp[]) {
  const p: EmbedTemplateProp[] = [];
  props.forEach(({ name, value }) => {
    if (typeof value === "string") {
      p.push({ type: "string", name, value });
    }
    if (typeof value === "number") {
      p.push({ type: "number", name, value });
    }
    // @todo add support for other prop types.
  });
  return p;
};
