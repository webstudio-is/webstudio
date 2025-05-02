import { Box as Box, HtmlEmbed as HtmlEmbed } from "../components";

const Component = () => {
  return (
    <Box className={"w-box"}>
      <HtmlEmbed
        code={
          '<h1>Styling HTML with Content Embed</h1>\n<p>Content Embed allows styling of HTML, which primarily comes from external data.</p>\n<h2>How to Use Content Embed</h2>\n<ul>\n  <li>Every element is shown in the Navigator.</li>\n  <li>Apply styles and Tokens to each element.</li>\n  <li>Adjustments to elements apply universally within this embed, ensuring consistency across your content.</li>\n</ul>\n<hr>\n<h2>This sample text contains all the elements that can be styled.</h2>\n<p>Any elements that were not used above are used below.</p>\n<h3>Heading 3</h3>\n<h4>Heading 4</h4>\n<h5>Heading 5</h5>\n<h6>Heading 6</h6>\n<p><a href="#">Links</a> connect your content to relevant resources.</p>\n<p><strong>Bold text</strong> makes your important points stand out.</p>\n<p><em>Italic text</em> is great for emphasizing terms.</p>\n<ol>\n  <li>First Step</li>\n  <li>Second Step</li>\n</ol>\n<img src="data:image/svg+xml;base64,PHN2ZwogIHdpZHRoPSIxNDAiCiAgaGVpZ2h0PSIxNDAiCiAgdmlld0JveD0iMCAwIDYwMCA2MDAiCiAgZmlsbD0ibm9uZSIKICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgPgogIDxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjREZFM0U2IiAvPgogIDxwYXRoCiAgICBmaWxsLXJ1bGU9ImV2ZW5vZGQiCiAgICBjbGlwLXJ1bGU9ImV2ZW5vZGQiCiAgICBkPSJNNDUwIDE3MEgxNTBDMTQxLjcxNiAxNzAgMTM1IDE3Ni43MTYgMTM1IDE4NVY0MTVDMTM1IDQyMy4yODQgMTQxLjcxNiA0MzAgMTUwIDQzMEg0NTBDNDU4LjI4NCA0MzAgNDY1IDQyMy4yODQgNDY1IDQxNVYxODVDNDY1IDE3Ni43MTYgNDU4LjI4NCAxNzAgNDUwIDE3MFpNMTUwIDE0NUMxMjcuOTA5IDE0NSAxMTAgMTYyLjkwOSAxMTAgMTg1VjQxNUMxMTAgNDM3LjA5MSAxMjcuOTA5IDQ1NSAxNTAgNDU1SDQ1MEM0NzIuMDkxIDQ1NSA0OTAgNDM3LjA5MSA0OTAgNDE1VjE4NUM0OTAgMTYyLjkwOSA0NzIuMDkxIDE0NSA0NTAgMTQ1SDE1MFoiCiAgICBmaWxsPSIjQzFDOENEIgogIC8+CiAgPHBhdGgKICAgIGQ9Ik0yMzcuMTM1IDIzNS4wMTJDMjM3LjEzNSAyNTUuNzIzIDIyMC4zNDUgMjcyLjUxMiAxOTkuNjM1IDI3Mi41MTJDMTc4LjkyNCAyNzIuNTEyIDE2Mi4xMzUgMjU1LjcyMyAxNjIuMTM1IDIzNS4wMTJDMTYyLjEzNSAyMTQuMzAxIDE3OC45MjQgMTk3LjUxMiAxOTkuNjM1IDE5Ny41MTJDMjIwLjM0NSAxOTcuNTEyIDIzNy4xMzUgMjE0LjMwMSAyMzcuMTM1IDIzNS4wMTJaIgogICAgZmlsbD0iI0MxQzhDRCIKICAvPgogIDxwYXRoCiAgICBkPSJNMTYwIDQwNVYzNjcuMjA1TDIyMS42MDkgMzA2LjM2NEwyNTYuNTUyIDMzOC42MjhMMzU4LjE2MSAyMzRMNDQwIDMxNi4wNDNWNDA1SDE2MFoiCiAgICBmaWxsPSIjQzFDOENEIgogIC8+Cjwvc3ZnPg==">\n<blockquote>Capture attention with a powerful quote.</blockquote>\n<p>Using <code>console.log("Hello World");</code> will log to the console.</p>\n<table>\n  <tr>\n    <th>Header 1</th>\n    <th>Header 2</th>\n    <th>Header 3</th>\n  </tr>\n  <tr>\n    <td>Cell 1.1</td>\n    <td>Cell 1.2</td>\n    <td>Cell 1.3</td>\n  </tr>\n  <tr>\n    <td>Cell 2.1</td>\n    <td>Cell 2.2</td>\n    <td>Cell 2.3</td>\n  </tr>\n  <tr>\n    <td>Cell 3.1</td>\n    <td>Cell 3.2</td>\n    <td>Cell 3.3</td>\n  </tr>\n</table>'
        }
        className={"w-html-embed"}
      ></HtmlEmbed>
    </Box>
  );
};

export default {
  title: "Components/ContentEmbed",
};

const Story = {
  render() {
    return (
      <>
        <style>
          {`
@media all {
  :where(div.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(address.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(article.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(aside.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(figure.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(footer.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(header.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(main.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(nav.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(section.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-html-embed) {
    display: contents;
    white-space: normal;
    white-space-collapse: collapse
  }
}

      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as ContentEmbed };
