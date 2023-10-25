import { Flex, Grid } from "@webstudio-is/design-system";
import { Image, createImageLoader } from "@webstudio-is/image";

/**
 * Exact google truncation logic is not known, but this is a close approximation
 */
export const truncateMetaText = (
  description: string,
  maxLength: number = 155
) => {
  if (description.length <= maxLength) {
    return description;
  }

  const ellipsis = "\u00A0...";
  let truncated = description.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(" ");

  // If there's a space to truncate at, use it; otherwise, use the max length
  truncated =
    lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) : truncated;

  return `${truncated}${ellipsis}`;
};

export const truncateUrl = (pageUrl: string, maxLength = 53) => {
  if (pageUrl.length <= maxLength) {
    return pageUrl;
  }

  const ellipsis = "...";
  const truncated = pageUrl.substring(0, maxLength);

  return `${truncated}${ellipsis}`;
};

const formatUrl = (urlString: string) => {
  const url = new URL(urlString);

  return `${url.origin}${url.pathname.split("/").join(" › ")}`;
};

type SearchPreviewProps = {
  /**
   * The URL of the page to preview in search results
   */
  pageUrl: string;
  title: string;
  description: string;
  siteName: string;
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

const loader = createImageLoader({ imageBaseUrl: "" });

export const SearchPreview = (props: SearchPreviewProps) => {
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
            {truncateMetaText(props.siteName)}
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
            {/*todo add > instead of / */ formatUrl(truncateUrl(props.pageUrl))}
            <VerticalThreePointIcon />
          </Flex>
        </Grid>
      </Flex>
      <div />
      <Flex
        css={{
          fontSize: "20px",
          fontWeight: 400,
          color: "#1a0dab",
        }}
      >
        {truncateMetaText(props.title, 60)}
      </Flex>
      <Flex
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
        {truncateMetaText(props.description)}
      </Flex>
    </Grid>
  );
};
