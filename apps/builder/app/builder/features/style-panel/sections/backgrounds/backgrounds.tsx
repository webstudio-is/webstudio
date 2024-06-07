import { useStore } from "@nanostores/react";
import type { SectionProps } from "../shared/section";
import { styleConfigByName } from "../../shared/configs";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import {
  CssValueListItem,
  CssValueListArrowFocus,
  Flex,
  Grid,
  Label,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  SmallIconButton,
  SmallToggleButton,
  theme,
  useSortable,
} from "@webstudio-is/design-system";
import {
  EyeconOpenIcon,
  EyeconClosedIcon,
  SubtractIcon,
  PlusIcon,
} from "@webstudio-is/icons";
import { $assets } from "~/shared/nano-states";
import { PropertyName } from "../../shared/property-name";
import type { StyleInfo } from "../../shared/style-info";
import { ColorControl } from "../../controls/color/color-control";
import {
  getLayerCount,
  layeredBackgroundProps,
  addLayer,
  deleteLayer,
  setLayerProperty,
  type SetBackgroundProperty,
  type DeleteBackgroundProperty,
  getLayerBackgroundStyleInfo,
  deleteLayerProperty,
  swapLayers,
  getLayersStyleSource,
  deleteLayers,
} from "./background-layers";
import { BackgroundContent } from "./background-content";
import { getLayerName, LayerThumbnail } from "./background-thumbnail";
import { useMemo } from "react";
import type { RgbValue, StyleProperty } from "@webstudio-is/css-engine";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import { getDots } from "../../shared/collapsible-section";

const Layer = (props: {
  id: string;
  index: number;
  isHighlighted: boolean;
  layerStyle: StyleInfo;
  setProperty: SetBackgroundProperty;
  deleteProperty: DeleteBackgroundProperty;
  deleteLayer: () => void;
  setBackgroundColor: (color: RgbValue) => void;
}) => {
  const assets = useStore($assets);

  const backgroundImageStyle = props.layerStyle.backgroundImage?.value;
  const isHidden =
    backgroundImageStyle?.type === "image" ||
    backgroundImageStyle?.type === "unparsed"
      ? Boolean(backgroundImageStyle.hidden)
      : false;

  const handleHiddenChange = (hidden: boolean) => {
    if (
      backgroundImageStyle?.type === "image" ||
      backgroundImageStyle?.type === "unparsed"
    ) {
      props.setProperty("backgroundImage")({
        ...backgroundImageStyle,
        hidden,
      });
    }
  };

  const canDisable =
    backgroundImageStyle?.type !== "image" &&
    backgroundImageStyle?.type !== "unparsed";

  return (
    <FloatingPanel
      title="Background"
      content={
        <BackgroundContent
          currentStyle={props.layerStyle}
          setProperty={props.setProperty}
          deleteProperty={props.deleteProperty}
          setBackgroundColor={props.setBackgroundColor}
        />
      }
    >
      <CssValueListItem
        id={props.id}
        draggable={true}
        active={props.isHighlighted}
        index={props.index}
        label={
          <Label truncate onReset={props.deleteLayer}>
            {getLayerName(props.layerStyle, assets)}
          </Label>
        }
        thumbnail={<LayerThumbnail layerStyle={props.layerStyle} />}
        hidden={isHidden}
        buttons={
          <>
            <SmallToggleButton
              disabled={canDisable}
              pressed={isHidden}
              onPressedChange={handleHiddenChange}
              variant="normal"
              tabIndex={-1}
              icon={isHidden ? <EyeconClosedIcon /> : <EyeconOpenIcon />}
            />

            <SmallIconButton
              variant="destructive"
              tabIndex={-1}
              icon={<SubtractIcon />}
              onClick={props.deleteLayer}
            />
          </>
        }
      />
    </FloatingPanel>
  );
};

export const properties = [
  "backgroundAttachment",
  "backgroundClip",
  "backgroundColor",
  "backgroundImage",
  "backgroundOrigin",
  "backgroundPosition",
  "backgroundRepeat",
  "backgroundSize",
  "backgroundBlendMode",
] satisfies Array<StyleProperty>;

const BackgroundsCollapsibleSection = ({
  children,
  currentStyle,
  createBatchUpdate,
}: SectionProps & { children: React.ReactNode }) => {
  const label = "Backgrounds";
  const [isOpen, setIsOpen] = useOpenState({ label });
  const layersStyleSource = getLayersStyleSource(currentStyle);

  return (
    <CollapsibleSectionRoot
      label={label}
      fullWidth
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => {
        setIsOpen(nextIsOpen);
      }}
      trigger={
        <SectionTitle
          dots={getDots(currentStyle, properties)}
          suffix={
            <SectionTitleButton
              prefix={<PlusIcon />}
              onClick={() => {
                addLayer(currentStyle, createBatchUpdate);
                setIsOpen(true);
              }}
            />
          }
        >
          <PropertyName
            style={currentStyle}
            title="Backgrounds"
            description="Add one or more backgrounds to the instance such as a color, image, or gradient."
            properties={layeredBackgroundProps}
            label={
              <SectionTitleLabel color={layersStyleSource}>
                {label}
              </SectionTitleLabel>
            }
            onReset={() => {
              deleteLayers(createBatchUpdate);
            }}
          />
        </SectionTitle>
      }
    >
      {children}
    </CollapsibleSectionRoot>
  );
};

export const Section = (props: SectionProps) => {
  const { setProperty, deleteProperty, currentStyle, createBatchUpdate } =
    props;
  const layersCount = getLayerCount(currentStyle);

  const { items } = styleConfigByName("backgroundColor");

  const sortableItems = useMemo(
    () =>
      Array.from(Array(layersCount), (_, index) => ({
        id: `${index}`,
        index,
      })),
    [layersCount]
  );

  const { dragItemId, placementIndicator, sortableRefCallback } = useSortable({
    items: sortableItems,
    onSort: (newIndex, oldIndex) => {
      swapLayers(newIndex, oldIndex, currentStyle, createBatchUpdate);
    },
  });

  return (
    <BackgroundsCollapsibleSection
      setProperty={setProperty}
      deleteProperty={deleteProperty}
      createBatchUpdate={createBatchUpdate}
      currentStyle={currentStyle}
    >
      <Flex gap={1} direction="column">
        <CssValueListArrowFocus dragItemId={dragItemId}>
          <Flex direction="column" ref={sortableRefCallback}>
            {sortableItems.map((layer, index) => (
              <Layer
                id={layer.id}
                index={index}
                key={layer.id}
                isHighlighted={dragItemId === layer.id}
                layerStyle={getLayerBackgroundStyleInfo(
                  layer.index,
                  currentStyle
                )}
                deleteLayer={deleteLayer(
                  layer.index,
                  currentStyle,
                  createBatchUpdate
                )}
                setProperty={setLayerProperty(
                  layer.index,
                  currentStyle,
                  createBatchUpdate
                )}
                deleteProperty={deleteLayerProperty(
                  layer.index,
                  currentStyle,
                  deleteProperty,
                  createBatchUpdate
                )}
                setBackgroundColor={setProperty("backgroundColor")}
              />
            ))}

            {placementIndicator}
          </Flex>
        </CssValueListArrowFocus>

        <Grid
          css={{
            px: theme.spacing[9],
            gridTemplateColumns: `1fr ${theme.spacing[23]}`,
          }}
        >
          <PropertyName
            style={currentStyle}
            properties={["backgroundColor"]}
            title={"Background Color"}
            label={"Color"}
            onReset={() => deleteProperty("backgroundColor")}
          />

          <ColorControl
            property={"backgroundColor"}
            items={items}
            currentStyle={currentStyle}
            setProperty={setProperty}
            deleteProperty={deleteProperty}
          />
        </Grid>
      </Flex>
    </BackgroundsCollapsibleSection>
  );
};
