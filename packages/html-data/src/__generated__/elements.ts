type Element = {
  description: string;
  categories: string[];
  children: string[];
};

export const elementsByTag: Record<string, Element> = {
  a: {
    description: "Hyperlink",
    categories: ["flow", "phrasing", "interactive", "palpable"],
    children: ["transparent"],
  },
  abbr: {
    description: "Abbreviation",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  address: {
    description: "Contact information for a page or article element",
    categories: ["flow", "palpable"],
    children: ["flow"],
  },
  area: {
    description: "Hyperlink or dead area on an image map",
    categories: ["flow", "phrasing"],
    children: [],
  },
  article: {
    description: "Self-contained syndicatable or reusable composition",
    categories: ["flow", "sectioning", "palpable"],
    children: ["flow"],
  },
  aside: {
    description: "Sidebar for tangentially related content",
    categories: ["flow", "sectioning", "palpable"],
    children: ["flow"],
  },
  audio: {
    description: "Audio player",
    categories: ["flow", "phrasing", "embedded", "interactive", "palpable"],
    children: ["source", "track", "transparent"],
  },
  b: {
    description: "Keywords",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  base: {
    description:
      "Base URL and default target navigable for hyperlinks and forms",
    categories: ["metadata"],
    children: [],
  },
  bdi: {
    description: "Text directionality isolation",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  bdo: {
    description: "Text directionality formatting",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  blockquote: {
    description: "A section quoted from another source",
    categories: ["flow", "palpable"],
    children: ["flow"],
  },
  body: {
    description: "Document body",
    categories: ["none"],
    children: ["flow"],
  },
  br: {
    description: "Line break, e.g. in poem or postal address",
    categories: ["flow", "phrasing"],
    children: [],
  },
  button: {
    description: "Button control",
    categories: [
      "flow",
      "phrasing",
      "interactive",
      "listed",
      "labelable",
      "submittable",
      "form-associated",
      "palpable",
    ],
    children: ["phrasing"],
  },
  canvas: {
    description: "Scriptable bitmap canvas",
    categories: ["flow", "phrasing", "embedded", "palpable"],
    children: ["transparent"],
  },
  caption: {
    description: "Table caption",
    categories: ["none"],
    children: ["flow"],
  },
  cite: {
    description: "Title of a work",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  code: {
    description: "Computer code",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  col: {
    description: "Table column",
    categories: ["none"],
    children: [],
  },
  colgroup: {
    description: "Group of columns in a table",
    categories: ["none"],
    children: ["col", "template"],
  },
  data: {
    description: "Machine-readable equivalent",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  datalist: {
    description: "Container for options for combo box control",
    categories: ["flow", "phrasing"],
    children: ["phrasing", "option", "script-supporting elements"],
  },
  dd: {
    description: "Content for corresponding dt element(s)",
    categories: ["none"],
    children: ["flow"],
  },
  del: {
    description: "A removal from the document",
    categories: ["flow", "phrasing", "palpable"],
    children: ["transparent"],
  },
  details: {
    description: "Disclosure control for hiding details",
    categories: ["flow", "interactive", "palpable"],
    children: ["summary", "flow"],
  },
  dfn: {
    description: "Defining instance",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  dialog: {
    description: "Dialog box or window",
    categories: ["flow"],
    children: ["flow"],
  },
  div: {
    description:
      "Generic flow container, or container for name-value groups in dl elements",
    categories: ["flow", "palpable"],
    children: ["flow"],
  },
  dl: {
    description:
      "Association list consisting of zero or more name-value groups",
    categories: ["flow", "palpable"],
    children: ["dt", "dd", "div", "script-supporting elements"],
  },
  dt: {
    description: "Legend for corresponding dd element(s)",
    categories: ["none"],
    children: ["flow"],
  },
  em: {
    description: "Stress emphasis",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  embed: {
    description: "Plugin",
    categories: ["flow", "phrasing", "embedded", "interactive", "palpable"],
    children: [],
  },
  fieldset: {
    description: "Group of form controls",
    categories: ["flow", "listed", "form-associated", "palpable"],
    children: ["legend", "flow"],
  },
  figcaption: {
    description: "Caption for figure",
    categories: ["none"],
    children: ["flow"],
  },
  figure: {
    description: "Figure with optional caption",
    categories: ["flow", "palpable"],
    children: ["figcaption", "flow"],
  },
  footer: {
    description: "Footer for a page or section",
    categories: ["flow", "palpable"],
    children: ["flow"],
  },
  form: {
    description: "User-submittable form",
    categories: ["flow", "palpable"],
    children: ["flow"],
  },
  h1: {
    description: "Heading",
    categories: ["flow", "heading", "palpable"],
    children: ["phrasing"],
  },
  h2: {
    description: "Heading",
    categories: ["flow", "heading", "palpable"],
    children: ["phrasing"],
  },
  h3: {
    description: "Heading",
    categories: ["flow", "heading", "palpable"],
    children: ["phrasing"],
  },
  h4: {
    description: "Heading",
    categories: ["flow", "heading", "palpable"],
    children: ["phrasing"],
  },
  h5: {
    description: "Heading",
    categories: ["flow", "heading", "palpable"],
    children: ["phrasing"],
  },
  h6: {
    description: "Heading",
    categories: ["flow", "heading", "palpable"],
    children: ["phrasing"],
  },
  head: {
    description: "Container for document metadata",
    categories: ["none"],
    children: ["metadata content"],
  },
  header: {
    description: "Introductory or navigational aids for a page or section",
    categories: ["flow", "palpable"],
    children: ["flow"],
  },
  hgroup: {
    description: "Heading container",
    categories: ["flow", "palpable"],
    children: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "script-supporting elements",
    ],
  },
  hr: {
    description: "Thematic break",
    categories: ["flow"],
    children: [],
  },
  html: {
    description: "Root element",
    categories: ["none"],
    children: ["head", "body"],
  },
  i: {
    description: "Alternate voice",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  iframe: {
    description: "Child navigable",
    categories: ["flow", "phrasing", "embedded", "interactive", "palpable"],
    children: [],
  },
  img: {
    description: "Image",
    categories: [
      "flow",
      "phrasing",
      "embedded",
      "interactive",
      "form-associated",
      "palpable",
    ],
    children: [],
  },
  input: {
    description: "Form control",
    categories: [
      "flow",
      "phrasing",
      "interactive",
      "listed",
      "labelable",
      "submittable",
      "resettable",
      "form-associated",
      "palpable",
    ],
    children: [],
  },
  ins: {
    description: "An addition to the document",
    categories: ["flow", "phrasing", "palpable"],
    children: ["transparent"],
  },
  kbd: {
    description: "User input",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  label: {
    description: "Caption for a form control",
    categories: ["flow", "phrasing", "interactive", "palpable"],
    children: ["phrasing"],
  },
  legend: {
    description: "Caption for fieldset",
    categories: ["none"],
    children: ["phrasing", "heading content"],
  },
  li: {
    description: "List item",
    categories: ["none"],
    children: ["flow"],
  },
  link: {
    description: "Link metadata",
    categories: ["metadata", "flow", "phrasing"],
    children: [],
  },
  main: {
    description: "Container for the dominant contents of the document",
    categories: ["flow", "palpable"],
    children: ["flow"],
  },
  map: {
    description: "Image map",
    categories: ["flow", "phrasing", "palpable"],
    children: ["transparent", "area"],
  },
  mark: {
    description: "Highlight",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  menu: {
    description: "Menu of commands",
    categories: ["flow", "palpable"],
    children: ["li", "script-supporting elements"],
  },
  meta: {
    description: "Text metadata",
    categories: ["metadata", "flow", "phrasing"],
    children: [],
  },
  meter: {
    description: "Gauge",
    categories: ["flow", "phrasing", "labelable", "palpable"],
    children: ["phrasing"],
  },
  nav: {
    description: "Section with navigational links",
    categories: ["flow", "sectioning", "palpable"],
    children: ["flow"],
  },
  noscript: {
    description: "Fallback content for script",
    categories: ["metadata", "flow", "phrasing"],
    children: ["varies"],
  },
  object: {
    description: "Image, child navigable, or plugin",
    categories: [
      "flow",
      "phrasing",
      "embedded",
      "interactive",
      "listed",
      "form-associated",
      "palpable",
    ],
    children: ["transparent"],
  },
  ol: {
    description: "Ordered list",
    categories: ["flow", "palpable"],
    children: ["li", "script-supporting elements"],
  },
  optgroup: {
    description: "Group of options in a list box",
    categories: ["none"],
    children: ["option", "script-supporting elements"],
  },
  option: {
    description: "Option in a list box or combo box control",
    categories: ["none"],
    children: ["text"],
  },
  output: {
    description: "Calculated output value",
    categories: [
      "flow",
      "phrasing",
      "listed",
      "labelable",
      "resettable",
      "form-associated",
      "palpable",
    ],
    children: ["phrasing"],
  },
  p: {
    description: "Paragraph",
    categories: ["flow", "palpable"],
    children: ["phrasing"],
  },
  picture: {
    description: "Image",
    categories: ["flow", "phrasing", "embedded", "palpable"],
    children: ["source", "one img", "script-supporting elements"],
  },
  pre: {
    description: "Block of preformatted text",
    categories: ["flow", "palpable"],
    children: ["phrasing"],
  },
  progress: {
    description: "Progress bar",
    categories: ["flow", "phrasing", "labelable", "palpable"],
    children: ["phrasing"],
  },
  q: {
    description: "Quotation",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  rp: {
    description: "Parenthesis for ruby annotation text",
    categories: ["none"],
    children: ["text"],
  },
  rt: {
    description: "Ruby annotation text",
    categories: ["none"],
    children: ["phrasing"],
  },
  ruby: {
    description: "Ruby annotation(s)",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing", "rt", "rp"],
  },
  s: {
    description: "Inaccurate text",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  samp: {
    description: "Computer output",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  script: {
    description: "Embedded script",
    categories: ["metadata", "flow", "phrasing", "script-supporting"],
    children: ["script, data, or script documentation"],
  },
  search: {
    description: "Container for search controls",
    categories: ["flow", "palpable"],
    children: ["flow"],
  },
  section: {
    description: "Generic document or application section",
    categories: ["flow", "sectioning", "palpable"],
    children: ["flow"],
  },
  select: {
    description: "List box control",
    categories: [
      "flow",
      "phrasing",
      "interactive",
      "listed",
      "labelable",
      "submittable",
      "resettable",
      "form-associated",
      "palpable",
    ],
    children: ["option", "optgroup", "script-supporting elements"],
  },
  slot: {
    description: "Shadow tree slot",
    categories: ["flow", "phrasing"],
    children: ["transparent"],
  },
  small: {
    description: "Side comment",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  source: {
    description: "Image source for img or media source for video or audio",
    categories: ["none"],
    children: [],
  },
  span: {
    description: "Generic phrasing container",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  strong: {
    description: "Importance",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  style: {
    description: "Embedded styling information",
    categories: ["metadata"],
    children: ["text"],
  },
  sub: {
    description: "Subscript",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  summary: {
    description: "Caption for details",
    categories: ["none"],
    children: ["phrasing", "heading content"],
  },
  sup: {
    description: "Superscript",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  table: {
    description: "Table",
    categories: ["flow", "palpable"],
    children: [
      "caption",
      "colgroup",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "script-supporting elements",
    ],
  },
  tbody: {
    description: "Group of rows in a table",
    categories: ["none"],
    children: ["tr", "script-supporting elements"],
  },
  td: {
    description: "Table cell",
    categories: ["none"],
    children: ["flow"],
  },
  template: {
    description: "Template",
    categories: ["metadata", "flow", "phrasing", "script-supporting"],
    children: [],
  },
  textarea: {
    description: "Multiline text controls",
    categories: [
      "flow",
      "phrasing",
      "interactive",
      "listed",
      "labelable",
      "submittable",
      "resettable",
      "form-associated",
      "palpable",
    ],
    children: [],
  },
  tfoot: {
    description: "Group of footer rows in a table",
    categories: ["none"],
    children: ["tr", "script-supporting elements"],
  },
  th: {
    description: "Table header cell",
    categories: ["interactive"],
    children: ["flow"],
  },
  thead: {
    description: "Group of heading rows in a table",
    categories: ["none"],
    children: ["tr", "script-supporting elements"],
  },
  time: {
    description: "Machine-readable equivalent of date- or time-related data",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  title: {
    description: "Document title",
    categories: ["metadata"],
    children: ["text"],
  },
  tr: {
    description: "Table row",
    categories: ["none"],
    children: ["th", "td", "script-supporting elements"],
  },
  track: {
    description: "Timed text track",
    categories: ["none"],
    children: [],
  },
  u: {
    description: "Unarticulated annotation",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  ul: {
    description: "List",
    categories: ["flow", "palpable"],
    children: ["li", "script-supporting elements"],
  },
  var: {
    description: "Variable",
    categories: ["flow", "phrasing", "palpable"],
    children: ["phrasing"],
  },
  video: {
    description: "Video player",
    categories: ["flow", "phrasing", "embedded", "interactive", "palpable"],
    children: ["source", "track", "transparent"],
  },
  wbr: {
    description: "Line breaking opportunity",
    categories: ["flow", "phrasing"],
    children: [],
  },
};
