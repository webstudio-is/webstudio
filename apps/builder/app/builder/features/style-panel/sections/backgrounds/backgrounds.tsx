import type { RenderCategoryProps } from "../../style-sections";
import { styleConfigByName } from "../../shared/configs";
import { FloatingPanel } from "~/builder/shared/floating-panel";
import {
  CssValueListItem,
  Flex,
  Grid,
  Label,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  SmallIconButton,
  theme,
} from "@webstudio-is/design-system";
import { SmallToggleButton } from "@webstudio-is/design-system";
import {
  EyeconOpenIcon,
  EyeconClosedIcon,
  SubtractIcon,
  PlusIcon,
} from "@webstudio-is/icons";
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
import { useSortable } from "./use-sortable";
import { useMemo } from "react";
import type { RgbValue, StyleProperty } from "@webstudio-is/css-data";
import {
  CollapsibleSectionBase,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import { getDots } from "../../shared/collapsible-section";

const Layer = (props: {
  id: string;
  isHighlighted: boolean;
  layerStyle: StyleInfo;
  setProperty: SetBackgroundProperty;
  deleteProperty: DeleteBackgroundProperty;
  deleteLayer: () => void;
  setBackgroundColor: (color: RgbValue) => void;
}) => {
  const backgrounImageStyle = props.layerStyle.backgroundImage?.value;
  const isHidden =
    backgrounImageStyle?.type === "image" ||
    backgrounImageStyle?.type === "unparsed"
      ? Boolean(backgrounImageStyle.hidden)
      : false;

  const handleHiddenChange = (hidden: boolean) => {
    if (
      backgrounImageStyle?.type === "image" ||
      backgrounImageStyle?.type === "unparsed"
    ) {
      props.setProperty("backgroundImage")({
        ...backgrounImageStyle,
        hidden,
      });
    }
  };

  const canDisable =
    backgrounImageStyle?.type !== "image" &&
    backgrounImageStyle?.type !== "unparsed";

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
        active={props.isHighlighted}
        data-id={props.id}
        label={
          <Label truncate onReset={props.deleteLayer}>
            {getLayerName(props.layerStyle)}
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
              tabIndex={0}
              icon={isHidden ? <EyeconClosedIcon /> : <EyeconOpenIcon />}
            />

            <SmallIconButton
              variant="destructive"
              tabIndex={0}
              icon={<SubtractIcon />}
              onClick={props.deleteLayer}
            />
          </>
        }
      />
    </FloatingPanel>
  );
};

const properties: StyleProperty[] = [
  "backgroundAttachment",
  "backgroundClip",
  "backgroundColor",
  "backgroundImage",
  "backgroundOrigin",
  "backgroundPosition",
  "backgroundRepeat",
  "backgroundSize",
  "backgroundBlendMode",
];

const BackgroundsCollapsibleSection = ({
  children,
  currentStyle,
  createBatchUpdate,
}: RenderCategoryProps & { children: React.ReactNode }) => {
  const label = "Backgrounds";
  const [isOpen, setIsOpen] = useOpenState({ label });
  const layersStyleSource = getLayersStyleSource(currentStyle);

  return (
    <CollapsibleSectionBase
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
            property={layeredBackgroundProps}
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
    </CollapsibleSectionBase>
  );
};

export const BackgroundsSection = (props: RenderCategoryProps) => {
  const { setProperty, deleteProperty, currentStyle, createBatchUpdate } =
    props;
  const layersCount = getLayerCount(currentStyle);

  const { items } = styleConfigByName("backgroundColor");

  const layers = useMemo(
    () =>
      Array.from(Array(layersCount), (_, index) => ({
        id: `${index}`,
        index,
      })),
    [layersCount]
  );

  const { dragItemId, placementIndicator, sortableRefCallback } = useSortable({
    items: layers,
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
      category={props.category}
    >
      <Flex gap={1} direction="column">
        <Flex
          gap={1}
          direction="column"
          ref={sortableRefCallback}
          css={{
            pointerEvents: dragItemId ? "none" : "auto",
            // to make DnD work we have to disable scrolling using touch
            touchAction: "none",
          }}
        >
          {layers.map((layer) => (
            <Layer
              id={layer.id}
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

        <Grid
          css={{
            px: theme.spacing[9],
            gridTemplateColumns: `1fr ${theme.spacing[23]}`,
          }}
        >
          <PropertyName
            style={currentStyle}
            property={"backgroundColor"}
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
