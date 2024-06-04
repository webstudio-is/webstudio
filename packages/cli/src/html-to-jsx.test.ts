import { test, expect } from "@jest/globals";
import * as React from "react";
import ReactDOMServer from "react-dom/server";
import esbuild from "esbuild";
import { htmlToJsx } from "./html-to-jsx";
import prettier from "prettier";

/**
 * Converts HTML to JSX, renders the JSX to HTML.
 */
const convertHtmlToJsxAndRenderToHtml = async (htmlCode: string) => {
  const jsxCode = htmlToJsx(htmlCode);

  const jsxComponentCode = `
  const Script = ({children, ...props}) => {
    if (children == null) {
      return <script {...props} />;
    }

    return <script {...props} dangerouslySetInnerHTML={{__html: children}} />;
  };

  const MyComponent = () => (
    <>
    ${jsxCode}
    </>
  );`;

  const jsxCompiled = await esbuild.transform(jsxComponentCode, {
    loader: "jsx",
    format: "cjs",
  });

  const renderFunction = new Function(
    "React",
    "ReactDOMServer",
    `${jsxCompiled.code}; return ReactDOMServer.renderToString(React.createElement(MyComponent));`
  );

  const result = renderFunction(React, ReactDOMServer);

  // replace to fix that renderToString(<input type="text" disabled />) results in <input type="text" disabled="">
  // and renderToString(<input type="text" disabled="" />) results in <input type="text">
  // Also renderToString can add comment <!-- -->
  return result.replace(/\s(\w+)=""/g, " $1").replace(/\n\s*<!-- -->/g, "");
};

const formatHtml = async (htmlCode: string) => {
  return await prettier.format(htmlCode, { parser: "html" });
};

test("Simple conversion works", async () => {
  const htmlCode = `
    <div id="1" class="hello world">Hello World</div>
    dsdsd
    <span>eee</span>
    <input type="text" disabled />
  `;
  const result = await convertHtmlToJsxAndRenderToHtml(htmlCode);

  expect(await formatHtml(htmlCode)).toBe(await formatHtml(result));
});

test("Simple script conversion works", async () => {
  const htmlCode = `
    <script>
      console.log('Hello World');
    </script>
  `;
  const result = await convertHtmlToJsxAndRenderToHtml(htmlCode);

  expect(await formatHtml(htmlCode)).toBe(await formatHtml(result));
});

test("Script conversion works with various chars", async () => {
  const htmlCode = `
    <script>
      const a = {
        z: 1,
        y: \`2\`,
      };

      console.log('</'+'Script>' + "ddd");

      const z = \`
      eee
      \`;
    </script>
  `;
  const result = await convertHtmlToJsxAndRenderToHtml(htmlCode);

  expect(await formatHtml(htmlCode)).toBe(await formatHtml(result));
});

test("Supports script src and meta", async () => {
  const htmlCode = `
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="hello/world" async defer></script>
  <script src="hello/world2"></script>
  `;
  const result = await convertHtmlToJsxAndRenderToHtml(htmlCode);

  expect(await formatHtml(htmlCode)).toBe(await formatHtml(result));
});

test.only("Should not fail", async () => {
  const htmlCode = `
   </s a="sd"><p><a><script src><scri pt>
  `;
  const result = await convertHtmlToJsxAndRenderToHtml(htmlCode);
  expect(result).toMatchInlineSnapshot(`
"
   <p><a><script src><scri pt>
  </script></a></p>"
`);
});
