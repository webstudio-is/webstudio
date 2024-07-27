import { toValue, type StyleProperty } from "@webstudio-is/css-engine";
import {
  CssValueListItem,
  Grid,
  Label,
  Select,
  SmallIconButton,
  theme,
} from "@webstudio-is/design-system";
import { humanizeString } from "~/shared/string-utils";
import type { SectionProps } from "../shared/section";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import { transformPanels } from "./transforms";
import { SubtractIcon } from "@webstudio-is/icons";

const property: StyleProperty = "backfaceVisibility";

export const BackfaceVisibility = (props: SectionProps) => {
  const { currentStyle, setProperty, deleteProperty } = props;
  const value = currentStyle[property]?.local;
  if (value?.type !== "keyword") {
    return;
  }

  return (
    <FloatingPanel
      title={humanizeString(property)}
      content={
        <Grid
          gap="4"
          align="center"
          css={{ p: theme.spacing[9], gridTemplateColumns: "1.5fr 1fr" }}
        >
          <Label>Backface Visibility</Label>
          <Select
            options={["visible", "hidden"]}
            value={toValue(value)}
            getLabel={humanizeString}
            onChange={(value) => {
              setProperty(property)({ type: "keyword", value });
            }}
          />
        </Grid>
      }
    >
      <CssValueListItem
        id={property}
        index={transformPanels.length + 1}
        label={
          <Label truncate>
            {humanizeString(property)}: {toValue(value)}
          </Label>
        }
        buttons={
          <SmallIconButton
            variant="destructive"
            tabIndex={-1}
            icon={<SubtractIcon />}
            onClick={() => deleteProperty(property)}
          />
        }
      ></CssValueListItem>
    </FloatingPanel>
  );
};
