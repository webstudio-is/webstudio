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
        border: "1px solid #323232",
        boxShadow:
          "0px 5px 17px 0px rgba(0, 0, 0, 0.30), 0px 2px 7px 0px rgba(0, 0, 0, 0.10)",
      }}
      gap={2}
    >
      {props.children}
    </Grid>
  );
};

CommandBar.displayName = "CommandBar";
