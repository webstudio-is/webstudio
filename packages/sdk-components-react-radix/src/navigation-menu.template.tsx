import type { ReactNode } from "react";
import { ChevronDownIcon } from "@webstudio-is/icons/svg";
import {
  $,
  css,
  PlaceholderValue,
  type TemplateMeta,
} from "@webstudio-is/template";
import { radix } from "./shared/proxy";
import { getButtonStyle } from "./shared/styles";
import {
  borderRadius,
  borderWidth,
  boxShadow,
  colors,
  fontSize,
  height,
  lineHeight,
  spacing,
  transition,
  weights,
  width,
} from "./shared/theme";

const components = [
  {
    title: "Sheet",
    href: "/docs/components/sheet",
    description:
      "Extends the Dialog component to display content that complements the main content of the screen.",
  },
  {
    title: "Navigation Menu",
    href: "/docs/components/navigation-menu",
    description: "A collection of links for navigating websites.",
  },
  {
    title: "Tabs",
    href: "/docs/components/tabs",
    description:
      "A set of layered sections of content—known as tab panels—that are displayed one at a time.",
  },
  {
    title: "Accordion",
    href: "/docs/components/accordion",
    description:
      "A vertically stacked set of interactive headings that each reveal a section of content.",
  },
  {
    title: "Dialog",
    href: "/docs/components/dialog",
    description:
      "A window overlaid on either the primary window or another dialog window, rendering the content underneath inert.",
  },
  {
    title: "Collapsible",
    href: "/docs/components/collapsible",
    description: "An interactive component which expands/collapses a panel.",
  },
  {
    title: "Popover",
    href: "/docs/components/popover",
    description: "Displays rich content in a portal, triggered by a button.",
  },
  {
    title: "Tooltip",
    href: "/docs/components/tooltip",
    description:
      "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.",
  },
  {
    title: "Button",
    href: "/docs/components/button",
    description: "Displays a button or a component that looks like a button.",
  },
];

const createMenuContentItem = (props: (typeof components)[number]) => (
  <radix.NavigationMenuLink key={props.title}>
    <$.Link
      href={`https://ui.shadcn.com${props.href}`}
      // block select-none space-y-1 rounded-md p-3 leading-none
      // no-underline outline-none transition-colors
      // hover:bg-accent hover:text-accent-foreground
      // focus:bg-accent focus:text-accent-foreground
      ws:style={css`
        color: inherit;
        display: flex;
        flex-direction: column;
        user-select: none;
        gap: ${spacing[1]};
        border-radius: ${borderRadius.md};
        padding: ${spacing[3]};
        line-height: ${lineHeight.none};
        text-decoration-line: none;
        outline: none;
        &:hover,
        &:focus {
          background-color: ${colors.accent};
          color: ${colors.accentForeground};
        }
      `}
    >
      <$.Text
        // text-sm font-medium leading-none
        ws:style={css`
          font-size: ${fontSize.sm};
          font-weight: ${weights.medium};
          line-height: ${lineHeight.none};
        `}
      >
        {new PlaceholderValue(props.title)}
      </$.Text>
      <$.Paragraph
        // line-clamp-2 text-sm leading-snug text-muted-foreground
        ws:style={css`
          margin: 0;
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          font-size: ${fontSize.sm};
          line-height: ${lineHeight.snug};
          color: ${colors.mutedForeground};
        `}
      >
        {new PlaceholderValue(props.description)}
      </$.Paragraph>
    </$.Link>
  </radix.NavigationMenuLink>
);

const createMenuContentList = (props: { count: number; offset: number }) => (
  <$.Box
    ws:label="Flex Column"
    ws:style={css`
      width: ${width[64]};
      display: flex;
      gap: ${spacing[4]};
      flex-direction: column;
    `}
  >
    {components
      .slice(props.offset, props.offset + props.count)
      .map(createMenuContentItem)}
  </$.Box>
);

const aboutMenuContent = (
  <$.Box
    ws:label="Content"
    ws:style={css`
      display: flex;
      gap: ${spacing[4]};
      padding: ${spacing[2]};
    `}
  >
    <$.Box
      ws:style={css`
        background-color: ${colors.border};
        padding: ${spacing[4]};
        width: ${width[48]};
        border-radius: ${borderRadius.md};
      `}
    >
      {new PlaceholderValue("")}
    </$.Box>
    {createMenuContentList({ count: 3, offset: 0 })}
  </$.Box>
);

const componentsMenuContent = (
  <$.Box
    ws:label="Content"
    ws:style={css`
      display: flex;
      gap: ${spacing[4]};
    `}
  >
    {createMenuContentList({ count: 3, offset: 3 })}
    {createMenuContentList({ count: 3, offset: 6 })}
  </$.Box>
);

const createMenuItem = (title: string, content: ReactNode) => {
  return (
    <radix.NavigationMenuItem>
      <radix.NavigationMenuTrigger>
        <$.Button
          ws:style={[
            ...getButtonStyle("ghost", "sm"),
            ...css`
              --navigation-menu-trigger-icon-transform: 0deg;
              &[data-state="open"] {
                --navigation-menu-trigger-icon-transform: 180deg;
              }
            `,
          ]}
        >
          <$.Text>{new PlaceholderValue(title)}</$.Text>
          <$.Box
            ws:label="Icon Container"
            // h-4 w-4 shrink-0 transition-transform duration-200
            ws:style={css`
              margin-left: ${spacing[1]};
              rotate: var(--navigation-menu-trigger-icon-transform);
              height: ${height[4]};
              width: ${width[4]};
              flex-shrink: 0;
              transition: ${transition.all};
              transition-duration: 200ms;
            `}
          >
            <$.HtmlEmbed ws:label="Chevron Icon" code={ChevronDownIcon} />
          </$.Box>
        </$.Button>
      </radix.NavigationMenuTrigger>
      <radix.NavigationMenuContent
        // left-0 top-0 absolute w-max
        ws:style={css`
          left: 0;
          top: 0;
          positon: absolute;
          width: max-content;
          padding: ${spacing[4]};
        `}
      >
        {content}
      </radix.NavigationMenuContent>
    </radix.NavigationMenuItem>
  );
};

const createMenuLink = (title: string) => {
  return (
    <radix.NavigationMenuItem>
      <radix.NavigationMenuLink>
        <$.Link
          ws:style={[
            ...getButtonStyle("ghost", "sm"),
            ...css`
              text-decoration-line: none;
              color: currentColor;
            `,
          ]}
        >
          {new PlaceholderValue(title)}
        </$.Link>
      </radix.NavigationMenuLink>
    </radix.NavigationMenuItem>
  );
};

export const meta: TemplateMeta = {
  category: "radix",
  description: "A collection of links for navigating websites.",
  order: 2,
  template: (
    <radix.NavigationMenu
      // relative
      // Omiting this: z-10 flex max-w-max flex-1 items-center justify-center
      ws:style={css`
        position: relative;
        max-width: max-content;
      `}
    >
      <radix.NavigationMenuList
        ws:style={css`
          /* ul defaults in tailwind */
          padding: 0;
          margin: 0;
          /* shadcdn styles */
          display: flex;
          flex: 1 1 0;
          list-style-type: none;
          align-items: center;
          justify-content: center;
          gap: ${spacing[1]};
        `}
      >
        {createMenuItem("About", aboutMenuContent)}
        {createMenuItem("Components", componentsMenuContent)}
        {createMenuLink("Standalone")}
      </radix.NavigationMenuList>
      <$.Box
        ws:label="Viewport Container"
        // absolute left-0 top-full flex justify-center
        ws:style={css`
          position: absolute;
          left: 0;
          top: 100%;
          display: flex;
          justify-content: center;
        `}
      >
        <radix.NavigationMenuViewport
          /*
            origin-top-center relative mt-1.5 w-full
            overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg
            h-[var(--radix-navigation-menu-viewport-height)]
            w-[var(--radix-navigation-menu-viewport-width)]
            // anims
            [animation-duration:150ms!important] [transition-duration:150ms!important]
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90
          */
          ws:style={css`
            position: relative;
            margin-top: ${spacing[1.5]};
            overflow: hidden;
            border-radius: ${borderRadius.md};
            border: ${borderWidth.DEFAULT} solid ${colors.border};
            background-color: ${colors.popover};
            color: ${colors.popoverForeground};
            box-shadow: ${boxShadow.lg};
            height: var(--radix-navigation-menu-viewport-height);
            width: var(--radix-navigation-menu-viewport-width);
          `}
        />
      </$.Box>
    </radix.NavigationMenu>
  ),
};
