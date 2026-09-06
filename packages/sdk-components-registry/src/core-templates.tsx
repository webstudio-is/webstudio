/** @jsxImportSource @webstudio-is/template */
/** Assembles core templates that depend on registered React components. */
import { createElement, type ElementType } from "react";
import { Webstudio1cIcon } from "@webstudio-is/icons/svg";
import {
  blockComponent,
  contentBlockDocumentProp,
  contentBlockMdxTemplateDescriptors,
  elementComponent,
  getDefaultContentBlockTemplateName,
  type ContentBlockMdxTemplateDescriptor,
} from "@webstudio-is/sdk";
import { intrinsicCoreTemplates } from "@webstudio-is/sdk/core-templates";
import {
  css,
  Parameter,
  setInstanceMeta,
  setTemplateMeta,
  type TemplateMeta,
  ws,
} from "@webstudio-is/template";
import {
  CodeText,
  HtmlEmbed,
} from "@webstudio-is/sdk-components-react/components";
import { componentsById } from "./components";

const BlockTemplate = ws.blockTemplate;
const BlockBody = ws.contentBlockBody;
const blockDocument = new Parameter(contentBlockDocumentProp);

const listItemMdxTemplateDescriptor = contentBlockMdxTemplateDescriptors.find(
  ({ resolutionKey }) => resolutionKey === "element:li"
);
if (listItemMdxTemplateDescriptor?.kind !== "element") {
  throw new Error("Expected the Content Block list item template descriptor");
}

const createContentBlockMdxTemplate = (
  descriptor: ContentBlockMdxTemplateDescriptor
) => {
  if (descriptor.kind === "element") {
    const name = getDefaultContentBlockTemplateName({
      component: elementComponent,
      tag: descriptor.tag,
    });
    if (descriptor.tag === "ul" || descriptor.tag === "ol") {
      return setTemplateMeta(
        { name, label: descriptor.label },
        createElement(
          descriptor.tag,
          { key: descriptor.resolutionKey },
          createElement(listItemMdxTemplateDescriptor.tag)
        )
      );
    }
    return setTemplateMeta(
      { name, label: descriptor.label },
      createElement(descriptor.tag, { key: descriptor.resolutionKey })
    );
  }

  const component = componentsById.get(descriptor.component);
  if (component === undefined) {
    throw new Error(
      `Content Block component template "${descriptor.component}" is not registered`
    );
  }
  return setTemplateMeta(
    {
      name: getDefaultContentBlockTemplateName({
        component: descriptor.component,
      }),
      label: descriptor.label,
    },
    createElement(
      component as ElementType,
      { key: descriptor.resolutionKey },
      descriptor.component === "CodeText"
        ? 'const status = "ready";'
        : undefined
    )
  );
};

const contentBlockDefaultTemplates = contentBlockMdxTemplateDescriptors.flatMap(
  (descriptor) => [
    ...(descriptor.resolutionKey === "component:CodeText"
      ? [
          setTemplateMeta(
            { name: "HtmlEmbed" },
            <HtmlEmbed key="custom:HtmlEmbed" />
          ),
        ]
      : []),
    createContentBlockMdxTemplate(descriptor),
  ]
);

const blockMeta: TemplateMeta = {
  category: "general",
  template: (
    <ws.block document={blockDocument}>
      {setInstanceMeta(
        { label: "Templates" },
        <BlockTemplate>{contentBlockDefaultTemplates}</BlockTemplate>
      )}
      <BlockBody>
        <p>
          The Content Block component designates regions on the page where
          pre-styled instances can be inserted in{" "}
          <a href="https://wstd.us/content-block">Content mode</a>.
        </p>
        <ul>
          <li>
            In Content mode, you can edit content inside this Content Block and
            add new instances predefined in templates. Content outside Content
            Blocks is read-only.
          </li>
          <li>
            To predefine instances for insertion in Content mode, switch to
            Design mode and add them to the Templates container.
          </li>
          <li>
            To insert predefined instances in Content mode, click the + button
            while hovering over the Content Block on the canvas and choose an
            instance from the list.
          </li>
        </ul>
      </BlockBody>
    </ws.block>
  ),
};

const builtWithWebstudioMeta: TemplateMeta = {
  category: "other",
  description:
    "A “Built with Webstudio” badge should be added to every project page on the free plan. This helps Webstudio spread awareness as a platform.",
  icon: Webstudio1cIcon,
  template: setInstanceMeta(
    { label: "Built with Webstudio" },
    <a
      href="https://webstudio.is/?via=badge"
      target="_blank"
      ws:style={css`
        display: inline-flex;
        gap: 6px;
        align-items: center;
        justify-content: center;
        position: fixed;
        z-index: 1000;
        padding: 6px 10px;
        right: 16px;
        bottom: 16px;
        color: rgba(251, 252, 253, 1);
        font-family: system-ui, sans-serif;
        font-size: 12px;
        font-weight: 500;
        line-height: 1;
        border: 1px solid transparent;
        border-radius: 9px;
        text-decoration-line: none;
        text-wrap-mode: nowrap;
        background-clip: padding-box, border-box;
        background-origin: padding-box, border-box;
        background-image:
          linear-gradient(135deg, #4a4efa 0%, #bd2fdb 66%, #ec59ce 100%),
          linear-gradient(
            135deg,
            #92fddc 0%,
            #7d7ffb 31.94%,
            #ed72fe 64.24%,
            #fdd791 100%
          );
      `}
    >
      {setInstanceMeta(
        { label: "Logo" },
        <HtmlEmbed
          code={Webstudio1cIcon}
          ws:style={css`
            display: block;
            width: 16px;
            height: 16px;
            flex-shrink: 0;
          `}
        />
      )}
      {setInstanceMeta({ label: "Text" }, <div>Built with Webstudio</div>)}
    </a>
  ),
};

export const coreTemplates = {
  ...intrinsicCoreTemplates,
  [blockComponent]: blockMeta,
  code_text: {
    category: "typography",
    template: <CodeText>{'const status = "ready";'}</CodeText>,
  },
  builtWithWebstudio: builtWithWebstudioMeta,
} satisfies Record<string, TemplateMeta>;
