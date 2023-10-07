// import { theme } from "../../stitches.config";
import { theme } from "../../stitches.config";
import { Grid } from "../grid";

type Props = {
  children: React.ReactNode;
};

export const CommandBar = (props: Props) => {
  return (
    <Grid
      css={{
        gridTemplateColumns: `max-content 1fr`,
        gridAutoColumns: "max-content",
        gridAutoFlow: "column",
        padding: theme.spacing[5],
        backgroundColor: "#1D1D1D",
        borderRadius: 22,
      }}
      gap={2}
    >
      {props.children}
    </Grid>
  );
};

CommandBar.displayName = "CommandBar";
