// import { theme } from "../../stitches.config";
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
      }}
      gap={2}
    >
      {props.children}
    </Grid>
  );
};

CommandBar.displayName = "CommandBar";
