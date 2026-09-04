import {
  type TemplateMeta,
  $,
  setInstanceMeta,
  ws,
} from "@webstudio-is/template";
import { imagePlaceholderDataUrl } from "@webstudio-is/image";
import { ContentEmbedIcon } from "@webstudio-is/icons/svg";
const { HtmlEmbed } = $;

const descendant = (label: string, selector: string) =>
  setInstanceMeta({ label }, <ws.descendant selector={selector} />);

const htmlSample = `
<h1>Styling HTML with Content Embed</h1>
<p>Content Embed allows styling of HTML, which primarily comes from external data.</p>
<h2>How to Use Content Embed</h2>
<ul>
  <li>Every element is shown in the Navigator.</li>
  <li>Apply styles and Tokens to each element.</li>
  <li>Adjustments to elements apply universally within this embed, ensuring consistency across your content.</li>
</ul>
<hr>
<h2>This sample text contains all the elements that can be styled.</h2>
<p>Any elements that were not used above are used below.</p>
<h3>Heading 3</h3>
<h4>Heading 4</h4>
<h5>Heading 5</h5>
<h6>Heading 6</h6>
<p><a href="#">Links</a> connect your content to relevant resources.</p>
<p><strong>Bold text</strong> makes your important points stand out.</p>
<p><em>Italic text</em> is great for emphasizing terms.</p>
<ol>
  <li>First Step</li>
  <li>Second Step</li>
</ol>
<img src="${imagePlaceholderDataUrl}">
<blockquote>Capture attention with a powerful quote.</blockquote>
<p>Using <code>console.log("Hello World");</code> will log to the console.</p>
<table>
  <tr>
    <th>Header 1</th>
    <th>Header 2</th>
    <th>Header 3</th>
  </tr>
  <tr>
    <td>Cell 1.1</td>
    <td>Cell 1.2</td>
    <td>Cell 1.3</td>
  </tr>
  <tr>
    <td>Cell 2.1</td>
    <td>Cell 2.2</td>
    <td>Cell 2.3</td>
  </tr>
  <tr>
    <td>Cell 3.1</td>
    <td>Cell 3.2</td>
    <td>Cell 3.3</td>
  </tr>
</table>
`.trim();

export const meta: TemplateMeta = {
  category: "data",
  icon: ContentEmbedIcon,
  description:
    "Content Embed allows styling of HTML, which can be provided via the Code property statically or loaded dynamically from any Resource, for example, from a CMS.",
  order: 3,
  template: setInstanceMeta(
    { label: "Content Embed" },
    <HtmlEmbed code={htmlSample}>
      {descendant("Paragraph", " p")}
      {descendant("Heading 1", " h1")}
      {descendant("Heading 2", " h2")}
      {descendant("Heading 3", " h3")}
      {descendant("Heading 4", " h4")}
      {descendant("Heading 5", " h5")}
      {descendant("Heading 6", " h6")}
      {descendant("Bold", " :where(strong, b)")}
      {descendant("Italic", " :where(em, i)")}
      {descendant("Link", " a")}
      {descendant("Image", " img")}
      {descendant("Blockquote", " blockquote")}
      {descendant("Code Text", " code")}
      {descendant("List", " :where(ul, ol)")}
      {descendant("List Item", " li")}
      {descendant("Separator", " hr")}
      {descendant("Table", " table")}
      {descendant("Table Row", " tr")}
      {descendant("Table Header Cell", " th")}
      {descendant("Table Cell", " td")}
    </HtmlEmbed>
  ),
};
