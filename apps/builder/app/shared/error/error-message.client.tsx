import {
  AccessibleIcon,
  css,
  cssVar,
  Grid,
  LinkButton,
  Text,
  theme,
  webstudioBrand,
} from "@webstudio-is/design-system";
import { WebstudioIcon } from "@webstudio-is/icons";

const pageStyle = css({
  position: "fixed",
  justifyItems: "center",
  alignContent: "start",
  inset: 0,
  background: webstudioBrand.backgroundGradient,
  paddingTop: "10vh",
  // prevent global root styles override error color
  color: `light-dark(
    ${cssVar("--foreground-primary", "#11181c")},
    ${cssVar("--foreground-on-inverse", "#fff")}
  )`,
});

const standaloneButtonBackground = cssVar("--background-accent", "#096cff");
const standaloneButtonForeground = cssVar("--foreground-on-accent", "#fff");
const standaloneButtonHoverOverlay = `oklch(from ${standaloneButtonForeground} 0 0 h / 6.2745%)`;
const standaloneButtonPressedOverlay = `oklch(from ${standaloneButtonForeground} 0 0 h / 10.9804%)`;

const standaloneButtonStyle = {
  background: standaloneButtonBackground,
  color: standaloneButtonForeground,
  "&&[data-state=auto]:hover, &&[data-state=hover]": {
    background: `linear-gradient(${standaloneButtonHoverOverlay}, ${standaloneButtonHoverOverlay}), ${standaloneButtonBackground}`,
    color: standaloneButtonForeground,
  },
  "&&[data-state=auto]:focus-visible, &&[data-state=focus]": {
    color: standaloneButtonForeground,
    outline: `1px solid ${cssVar("--border-focus", "#297aff")}`,
    outlineOffset: "1px",
  },
  "&&[data-state=auto]:active, &&[data-state=pressed]": {
    background: `linear-gradient(${standaloneButtonPressedOverlay}, ${standaloneButtonPressedOverlay}), ${standaloneButtonBackground}`,
    color: standaloneButtonForeground,
  },
};

export const ErrorMessage = ({
  error,
}: {
  error: {
    status: number;
    statusText?: string;
    message: string;
    description?: string;
  };
}) => {
  return (
    <Grid className={pageStyle()} justify={"center"} gap={6}>
      <AccessibleIcon label="Logo">
        <WebstudioIcon size="60" />
      </AccessibleIcon>
      <div />
      <div />
      <Text
        css={{
          fontSize: theme.spacing[21],
          lineHeight: 1,
        }}
        variant={"bigTitle"}
      >
        {error.status}
      </Text>

      <Grid
        css={{
          justifyItems: "center",
          marginInline: theme.spacing[10],
          maxWidth: 600,
        }}
        gap={5}
      >
        <Grid
          css={{
            background: `light-dark(
              ${cssVar("--background-primary", "#fff")},
              ${cssVar("--background-inverse", "#11181c")}
            )`,
            padding: theme.spacing[7],
            borderRadius: theme.spacing[5],
            minWidth: theme.spacing[34],
          }}
          gap="3"
        >
          <Text
            css={{
              display: "-webkit-box",
              "-webkit-line-clamp": 4,
              "-webkit-box-orient": "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              wordBreak: "break-word",
            }}
            variant="brandSectionTitle"
            userSelect="text"
          >
            {error.message ?? error.statusText}
          </Text>

          {error.description && (
            <Text
              css={{ wordBreak: "break-word", whiteSpace: "pre-line" }}
              userSelect="text"
              variant="brandRegular"
            >
              {error.description}
            </Text>
          )}
        </Grid>
        <LinkButton color="primary" href="/" css={standaloneButtonStyle}>
          Go home
        </LinkButton>
      </Grid>
    </Grid>
  );
};
