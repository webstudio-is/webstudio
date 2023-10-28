import { Box, Flex, Grid } from "@webstudio-is/design-system";
import { Image, createImageLoader } from "@webstudio-is/image";
import { formatUrl, truncateByWords, truncate } from "./social-utils";
import env from "~/shared/env";

/**
 * Full description with links https://developers.google.com/search/docs/appearance/visual-elements-gallery
 */
type SearchPreviewProps = {
  /**
   *  https://developers.google.com/search/docs/appearance/site-names
   * ```html
   *   <script type="application/ld+json">
   *    {
   *      "@context" : "https://schema.org",
   *      "@type" : "WebSite",
   *      "name" : "Example",
   *      "url" : "https://example.com/"
   *    }
   *   </script>
   * ```
   */
  siteName: string;

  /**
   * Domain + Visible Url, The URL of the page to preview in search results
   * or https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
   */
  pageUrl: string;

  /**
   * https://developers.google.com/search/docs/appearance/title-link
   * ```html
   *    <title>Blue title link example</title>
   * ```
   */
  titleLink: string;

  /**
   * Snippets are automatically created from page content https://developers.google.com/search/docs/appearance/snippet
   * sometimes meta description or structured data can be used
   * ```html
   *   <meta name="description" content="This is the description of the content of the page">
   * ```
   */
  snippet: string;

  /**
   * https://developers.google.com/search/docs/appearance/favicon-in-search
   */
  faviconUrl: string;
};

/**
 * ... rotated 90 degrees
 */
const VerticalThreePointIcon = () => (
  <svg
    height="18"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
  </svg>
);

export const SearchPreview = (props: SearchPreviewProps) => {
  const loader = createImageLoader({ imageBaseUrl: env.IMAGE_BASE_URL });

  return (
    <Grid
      gap={1}
      css={{
        fontFamily: "arial,sans-serif",
        "& *": {
          boxSizing: "border-box",
        },
      }}
    >
      <Flex
        align={"center"}
        css={{
          gap: 12,
        }}
      >
        <Flex
          css={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            backgroundColor: "#f1f3f4",
            border: "1px solid #ecedef",
          }}
          justify={"center"}
          align={"center"}
        >
          <Image
            width={18}
            height={18}
            loader={loader}
            src={props.faviconUrl}
          />
        </Flex>
        <Grid>
          <Flex
            css={{
              color: "#202124",
              fontSize: "14px",
              lineHeight: "20px",
              whiteSpace: "nowrap",
            }}
          >
            {truncate(truncateByWords(props.siteName), 60)}
          </Flex>
          <Flex
            css={{
              fontSize: "12px",
              lineHeight: "18px",
              color: "#4d5156",
              gap: 8,
            }}
            align={"center"}
          >
            {/*todo add > instead of / */ formatUrl(truncate(props.pageUrl))}
            <VerticalThreePointIcon />
          </Flex>
        </Grid>
      </Flex>
      <div />
      <Box
        css={{
          fontSize: "20px",
          fontWeight: 400,
          color: "#1a0dab",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          width: "100%",
        }}
      >
        {truncateByWords(props.titleLink, 60)}
      </Box>
      <Box
        css={{
          lineHeight: 1.58,
          fontSize: 14,
          color: "#4d5156",
          "-webkit-line-clamp": 2,
          display: "-webkit-box",
          "-webkit-box-orient": "vertical",
          overflow: "hidden",
        }}
      >
        {truncateByWords(props.snippet)}
      </Box>
    </Grid>
  );
};
