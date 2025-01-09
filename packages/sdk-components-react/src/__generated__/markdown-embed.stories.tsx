import { Box as Box, MarkdownEmbed as MarkdownEmbed } from "../components";

const Component = () => {
  return (
    <Box className={"w-box"}>
      <MarkdownEmbed
        code={
          '# Styling Markdown with Markdown Embed\n\nMarkdown Embed allows styling of Markdown, which primarily comes from external data.\n\n## How to Use Markdown Embed\n\n- Every element is shown in the Navigator.\n- Apply styles and Tokens to each element.\n- Adjustments to elements apply universally within this embed, ensuring consistency across your content.\n\n---\n\n## This sample text contains all the elements that can be styled.\n\nAny elements that were not used above are used below.\n\n### Heading 3\n#### Heading 4\n##### Heading 5\n###### Heading 6\n\n[Links](#) connect your content to relevant resources.\n\n**Bold text** makes your important points stand out.\n\n*Italic text* is great for emphasizing terms.\n\n1. First Step\n2. Second Step\n\n![Image placeholder](data:image/svg+xml;base64,PHN2ZwogIHdpZHRoPSIxNDAiCiAgaGVpZ2h0PSIxNDAiCiAgdmlld0JveD0iMCAwIDYwMCA2MDAiCiAgZmlsbD0ibm9uZSIKICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiAgPgogIDxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjREZFM0U2IiAvPgogIDxwYXRoCiAgICBmaWxsLXJ1bGU9ImV2ZW5vZGQiCiAgICBjbGlwLXJ1bGU9ImV2ZW5vZGQiCiAgICBkPSJNNDUwIDE3MEgxNTBDMTQxLjcxNiAxNzAgMTM1IDE3Ni43MTYgMTM1IDE4NVY0MTVDMTM1IDQyMy4yODQgMTQxLjcxNiA0MzAgMTUwIDQzMEg0NTBDNDU4LjI4NCA0MzAgNDY1IDQyMy4yODQgNDY1IDQxNVYxODVDNDY1IDE3Ni43MTYgNDU4LjI4NCAxNzAgNDUwIDE3MFpNMTUwIDE0NUMxMjcuOTA5IDE0NSAxMTAgMTYyLjkwOSAxMTAgMTg1VjQxNUMxMTAgNDM3LjA5MSAxMjcuOTA5IDQ1NSAxNTAgNDU1SDQ1MEM0NzIuMDkxIDQ1NSA0OTAgNDM3LjA5MSA0OTAgNDE1VjE4NUM0OTAgMTYyLjkwOSA0NzIuMDkxIDE0NSA0NTAgMTQ1SDE1MFoiCiAgICBmaWxsPSIjQzFDOENEIgogIC8+CiAgPHBhdGgKICAgIGQ9Ik0yMzcuMTM1IDIzNS4wMTJDMjM3LjEzNSAyNTUuNzIzIDIyMC4zNDUgMjcyLjUxMiAxOTkuNjM1IDI3Mi41MTJDMTc4LjkyNCAyNzIuNTEyIDE2Mi4xMzUgMjU1LjcyMyAxNjIuMTM1IDIzNS4wMTJDMTYyLjEzNSAyMTQuMzAxIDE3OC45MjQgMTk3LjUxMiAxOTkuNjM1IDE5Ny41MTJDMjIwLjM0NSAxOTcuNTEyIDIzNy4xMzUgMjE0LjMwMSAyMzcuMTM1IDIzNS4wMTJaIgogICAgZmlsbD0iI0MxQzhDRCIKICAvPgogIDxwYXRoCiAgICBkPSJNMTYwIDQwNVYzNjcuMjA1TDIyMS42MDkgMzA2LjM2NEwyNTYuNTUyIDMzOC42MjhMMzU4LjE2MSAyMzRMNDQwIDMxNi4wNDNWNDA1SDE2MFoiCiAgICBmaWxsPSIjQzFDOENEIgogIC8+Cjwvc3ZnPg==)\n\n> Capture attention with a powerful quote.\n\nUsing `console.log("Hello World");` will log to the console.\n\n| Header 1   | Header 2   | Header 3   |\n|------------|------------|------------|\n| Cell 1.1   | Cell 1.2   | Cell 1.3   |\n| Cell 2.1   | Cell 2.2   | Cell 2.3   |\n| Cell 3.1   | Cell 3.2   | Cell 3.3   |'
        }
        className={"w-markdown-embed"}
      ></MarkdownEmbed>
    </Box>
  );
};

export default {
  title: "Components/MarkdownEmbed",
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
  :where(div.w-markdown-embed) {
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

export { Story as MarkdownEmbed };
