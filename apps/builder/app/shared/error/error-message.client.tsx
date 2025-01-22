import {
  AccessibleIcon,
  css,
  Grid,
  Link,
  Text,
  theme,
  buttonStyle,
} from "@webstudio-is/design-system";
import { WebstudioIcon } from "@webstudio-is/icons";

const pageStyle = css({
  position: "fixed",
  justifyItems: "center",
  alignContent: "start",
  inset: 0,
  background: theme.colors.brandBackgroundDashboard,
  paddingTop: "10vh",
});

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
            background: theme.colors.backgroundPanel,
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
        <Link
          href="/"
          className={buttonStyle()}
          color="contrast"
          underline="none"
        >
          Go Home
        </Link>
      </Grid>
    </Grid>
  );
};
