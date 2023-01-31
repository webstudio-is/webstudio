import { Button } from "./button";
import { css, theme } from "../stitches.config";
import { typography } from "./typography";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

export default {
  title: "Library/Popover",
};

const bodyStyles = css(typography.regular, {
  padding: theme.spacing[7],
  "& p": { marginTop: 0, marginBottom: theme.spacing[9] },
});

const PopoverDemo = () => (
  <Popover defaultOpen>
    <PopoverTrigger asChild>
      <Button>Open</Button>
    </PopoverTrigger>
    <PopoverContent>
      <div className={bodyStyles()}>
        <p>Some content</p>
        <PopoverClose asChild>
          <Button color="ghost">Close</Button>
        </PopoverClose>
      </div>
    </PopoverContent>
  </Popover>
);
export { PopoverDemo as Popover };
