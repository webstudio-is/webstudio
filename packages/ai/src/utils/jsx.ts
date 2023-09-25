import * as parser from "@babel/parser";
import {
  type JSXElement,
  type JSXOpeningElement,
  type JSXText,
} from "@babel/types";
// import {
//   StyleValue,
//   parseCssDecl,
//   type StyleProperty,
// } from "@webstudio-is/css-data";
import type {
  EmbedTemplateProp,
  // EmbedTemplateStyleDecl,
  WsEmbedTemplate,
} from "@webstudio-is/react-sdk";
import JSON5 from "json5";
import type { JsonObject } from "type-fest";

export const jsxToWSEmbedTemplate = (code: string): WsEmbedTemplate => {
  const ast = parser.parseExpression(code, {
    plugins: ["jsx"],
  });

  if (ast.type === "JSXElement") {
    const template = transform(ast, code);
    return template === null ? [] : [template];
  }

  return [];
};

const transform = function transform(
  node: JSXElement | JSXText,
  code: string
): WsEmbedTemplate[number] | null {
  if (node.type === "JSXText") {
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
    // const styles = getProps(code, element.attributes, ["style"]);
    const props = parseProps(
      getProps(code, element.attributes).filter((prop) => prop.name !== "style")
    );

    return {
      type: "instance",
      component:
        element.name.type !== "JSXIdentifier" || element.name.name === "div"
          ? "Box"
          : element.name.name,
      styles: [],
      // styles.length === 0 || typeof styles[0].value === "string"
      //   ? []
      //   : parseStyles(styles[0].value),
      props,
      children: node.children
        .map((child) => {
          if (child.type === "JSXElement" || child.type === "JSXText") {
            return transform(child, code);
          }
          return null;
        })
        .filter((child) => child !== null) as WsEmbedTemplate,
    };
  }

  return null;
};

type Prop = {
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
    .filter((attr) => attr !== null) as Prop[];
};

const parseProps = function parseProps(props: Prop[]) {
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

// const parseStyles = function parseStyles(styleObject: JsonObject) {
//   return Object.entries(styleObject)
//     .flatMap(([property, value]) => {
//       const valueType = typeof value;

//       if (valueType !== "string" && valueType !== "number") {
//         return null;
//       }

//       const parsedStyles: EmbedTemplateStyleDecl[] = [];

//       (
//         Object.entries(
//           parseCssDecl(
//             // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//             // @ts-ignore @todo property is technically LonghandProperty | StyleProperty). Fix this.
//             property,
//             valueType === "number" && unitlessNumbers.has(property) === false
//               ? `${value}px`
//               : value
//           )
//         ) as Array<[StyleProperty, StyleValue]>
//       ).forEach(([property, value]) => {
//         try {
//           StyleValue.parse(value);
//           parsedStyles.push({
//             property,
//             value,
//           });
//         } catch (error) {
//           if (process.env.NODE_ENV !== "production") {
//             // eslint-disable-next-line no-console
//             console.warn(
//               true,
//               `Declaration parsing for \`${property}: ${JSON.stringify(
//                 value
//               )}\` failed`
//             );
//           }
//         }
//       });

//       return parsedStyles;
//     })
//     .filter((item) => item !== null) as EmbedTemplateStyleDecl[];
// };

// const unitlessNumbers = new Set([
//   "animationIterationCount",
//   "aspectRatio",
//   "borderImageOutset",
//   "borderImageSlice",
//   "borderImageWidth",
//   "boxFlex",
//   "boxFlexGroup",
//   "boxOrdinalGroup",
//   "columnCount",
//   "flex",
//   "flexGrow",
//   "flexOrder",
//   "flexPositive",
//   "flexShrink",
//   "flexNegative",
//   "fontWeight",
//   "gridRow",
//   "gridRowEnd",
//   "gridRowGap",
//   "gridRowStart",
//   "gridColumn",
//   "gridColumnEnd",
//   "gridColumnGap",
//   "gridColumnStart",
//   "lineClamp",
//   "opacity",
//   "order",
//   "orphans",
//   "tabSize",
//   "widows",
//   "zIndex",
//   "zoom",
//   "fillOpacity",
//   "floodOpacity",
//   "stopOpacity",
//   "strokeDasharray",
//   "strokeDashoffset",
//   "strokeMiterlimit",
//   "strokeOpacity",
//   "strokeWidth",
//   "scale",
//   "scaleX",
//   "scaleY",
//   "scaleZ",
//   "shadowOpacity",
// ]);
