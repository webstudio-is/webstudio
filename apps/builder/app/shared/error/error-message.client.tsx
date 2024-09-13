import {
  AccessibleIcon,
  css,
  Grid,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { WebstudioIcon } from "@webstudio-is/icons";
import { buttonStyle } from "~/auth/brand-button";

const pageStyle = css({
  position: "fixed",
  justifyItems: "center",
  alignContent: "start",
  inset: 0,
  background: `
      radial-gradient(65.88% 47.48% at 50% 50%, #FFFFFF 0%, rgba(255, 255, 255, 0) 100%),
      linear-gradient(0deg, rgba(255, 255, 255, 0) 49.46%, rgba(255, 255, 255, 0.33) 100%),
      linear-gradient(180deg, rgba(255, 174, 60, 0) 0%, rgba(230, 60, 254, 0.33) 100%),
      radial-gradient(211.58% 161.63% at 3.13% 100%, rgba(255, 174, 60, 0.3) 0%, rgba(227, 53, 255, 0) 100%),
      radial-gradient(107.1% 32.15% at 92.96% 5.04%, rgba(53, 255, 182, 0.2) 0%, rgba(74, 78, 250, 0.2) 100%), #EBFFFC;
    `,
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
    <Grid className={pageStyle()} justify={"center"} gap={9}>
      <div />
      <AccessibleIcon label="Logo">
        <WebstudioIcon size="60" />
      </AccessibleIcon>
      <Text
        css={{
          fontSize: theme.spacing[21],
        }}
        variant={"bigTitle"}
      >
        {error.status}
      </Text>

      <Grid
        css={{
          justifyItems: "center",
          mx: theme.spacing[10],
          maxWidth: 800,
        }}
        gap={5}
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
          variant={"bigTitle"}
        >
          {error.message ?? error.statusText}
        </Text>

        {error.description && (
          <Text
            css={{ wordBreak: "break-word", whiteSpace: "pre-line" }}
            variant={"regular"}
          >
            {error.description}
          </Text>
        )}

        <a href="/" className={buttonStyle()}>
          Go Home
        </a>
      </Grid>
    </Grid>
  );
};
