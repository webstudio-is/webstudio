import { useStore } from "@nanostores/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { css, type Rect } from "@webstudio-is/design-system";
import {
  $collaborators,
  assignCollaboratorColors,
  type CollaboratorInfo,
} from "@webstudio-is/sync-client";
import {
  $collaborativeInstanceSelector,
  $selectedPageId,
} from "~/shared/nano-states";
import { $canvasRect } from "~/builder/shared/nano-states";

const layerStyle = css({
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
});

const cursorStyle = css({
  position: "absolute",
  top: 0,
  left: 0,
  transformOrigin: "top left",
  transition: "transform 300ms ease-out",
  willChange: "transform",
});

const cursorLabelStyle = css({
  position: "absolute",
  top: 14,
  left: 12,
  padding: "2px 6px",
  borderRadius: 3,
  color: "white",
  fontSize: 11,
  fontWeight: 500,
  lineHeight: "16px",
  whiteSpace: "nowrap",
  boxShadow: "0 1px 2px rgb(0 0 0 / 20%)",
});

const getCollaboratorLabel = (collaborator: CollaboratorInfo) => {
  const name = collaborator.name?.trim();
  if (name === undefined || name.length === 0) {
    return;
  }
  return name;
};

type CursorCoordinates = {
  x: number;
  y: number;
};

type CursorVelocity = {
  x: number;
  y: number;
};

type CursorSample = CursorCoordinates & {
  time: number;
  velocity?: CursorVelocity;
};

const CURSOR_PREDICTION_MS = 80;
const CURSOR_VELOCITY_SMOOTHING = 0.5;
const MAX_PREDICTION_SAMPLE_MS = 250;
const MAX_PREDICTION_DISTANCE = 80;
const ZERO_CURSOR_VELOCITY = { x: 0, y: 0 };

const clampCoordinate = ({
  value,
  max,
}: {
  value: number;
  max: number | undefined;
}) => {
  if (max === undefined) {
    return value;
  }
  return Math.min(Math.max(value, 0), max);
};

const capPredictionDistance = ({
  x,
  y,
}: CursorCoordinates): CursorCoordinates => {
  const distance = Math.hypot(x, y);
  if (distance <= MAX_PREDICTION_DISTANCE) {
    return { x, y };
  }
  const scale = MAX_PREDICTION_DISTANCE / distance;
  return {
    x: x * scale,
    y: y * scale,
  };
};

const toCursorCoordinates = (sample: CursorSample): CursorCoordinates => ({
  x: sample.x,
  y: sample.y,
});

const computeSmoothedVelocity = ({
  measuredVelocity,
  previousVelocity,
}: {
  measuredVelocity: CursorVelocity;
  previousVelocity: CursorVelocity | undefined;
}) => {
  if (previousVelocity === undefined) {
    return measuredVelocity;
  }
  const dot =
    measuredVelocity.x * previousVelocity.x +
    measuredVelocity.y * previousVelocity.y;
  if (dot < 0) {
    return measuredVelocity;
  }
  return {
    x:
      previousVelocity.x * (1 - CURSOR_VELOCITY_SMOOTHING) +
      measuredVelocity.x * CURSOR_VELOCITY_SMOOTHING,
    y:
      previousVelocity.y * (1 - CURSOR_VELOCITY_SMOOTHING) +
      measuredVelocity.y * CURSOR_VELOCITY_SMOOTHING,
  };
};

const computePredictedCursor = ({
  current,
  previous,
  layerRect,
}: {
  current: CursorSample;
  previous: CursorSample | undefined;
  layerRect: Rect | undefined;
}): { coordinates: CursorCoordinates; velocity: CursorVelocity } => {
  if (previous === undefined) {
    return {
      coordinates: toCursorCoordinates(current),
      velocity: ZERO_CURSOR_VELOCITY,
    };
  }
  const elapsed = current.time - previous.time;
  if (
    elapsed <= 0 ||
    elapsed > MAX_PREDICTION_SAMPLE_MS ||
    (current.x === previous.x && current.y === previous.y)
  ) {
    return {
      coordinates: toCursorCoordinates(current),
      velocity: ZERO_CURSOR_VELOCITY,
    };
  }
  const velocity = computeSmoothedVelocity({
    measuredVelocity: {
      x: (current.x - previous.x) / elapsed,
      y: (current.y - previous.y) / elapsed,
    },
    previousVelocity: previous.velocity,
  });
  const prediction = capPredictionDistance({
    x: velocity.x * CURSOR_PREDICTION_MS,
    y: velocity.y * CURSOR_PREDICTION_MS,
  });
  return {
    coordinates: {
      x: clampCoordinate({
        value: current.x + prediction.x,
        max: layerRect?.width,
      }),
      y: clampCoordinate({
        value: current.y + prediction.y,
        max: layerRect?.height,
      }),
    },
    velocity,
  };
};

const shouldSkipCollaborator = ({
  currentPageId,
  collaboratorPageId,
}: {
  currentPageId: string | undefined;
  collaboratorPageId: string | undefined;
}) => {
  return (
    currentPageId !== undefined &&
    collaboratorPageId !== undefined &&
    collaboratorPageId !== currentPageId
  );
};

const hasCursorPosition = (
  pointerPosition: CollaboratorInfo["pointerPosition"]
) => {
  return pointerPosition !== undefined;
};

const computeCursorCoordinates = ({
  pointerPosition,
  layerRect,
  canvasRect,
}: {
  pointerPosition: CollaboratorInfo["pointerPosition"];
  layerRect: Rect | undefined;
  canvasRect: Rect | undefined;
}) => {
  if (pointerPosition === undefined || layerRect === undefined) {
    return { x: 0, y: 0 };
  }
  if (canvasRect !== undefined) {
    return {
      x:
        canvasRect.left -
        layerRect.left +
        pointerPosition.xRatio * canvasRect.width,
      y:
        canvasRect.top -
        layerRect.top +
        pointerPosition.yRatio * canvasRect.height,
    };
  }
  return {
    x: pointerPosition.xRatio * layerRect.width,
    y: pointerPosition.yRatio * layerRect.height,
  };
};

const isWithinLayer = ({
  x,
  y,
  layerRect,
}: {
  x: number;
  y: number;
  layerRect: Rect | undefined;
}) => {
  if (layerRect === undefined) {
    return true;
  }
  return x >= 0 && x < layerRect.width && y >= 0 && y < layerRect.height;
};

const toRenderableCollaboratorCursor = ({
  currentPageId,
  collaboratorPageId,
  pointerPosition,
  layerRect,
  canvasRect,
}: {
  currentPageId: string | undefined;
  collaboratorPageId: string | undefined;
  pointerPosition: CollaboratorInfo["pointerPosition"];
  layerRect: Rect | undefined;
  canvasRect: Rect | undefined;
}) => {
  if (shouldSkipCollaborator({ currentPageId, collaboratorPageId })) {
    return;
  }

  if (!hasCursorPosition(pointerPosition)) {
    return;
  }

  const coordinates = computeCursorCoordinates({
    pointerPosition,
    layerRect,
    canvasRect,
  });

  if (!isWithinLayer({ ...coordinates, layerRect })) {
    return;
  }

  return coordinates;
};

const areInstanceSelectorsEqual = (
  left: readonly string[] | undefined,
  right: readonly string[] | undefined
) => {
  if (left === right) {
    return true;
  }
  if (
    left === undefined ||
    right === undefined ||
    left.length !== right.length
  ) {
    return false;
  }
  return left.every((id, index) => id === right[index]);
};

const CollaborativeCursor = ({
  color,
  coordinates,
  label,
  layerRect,
  sampleTime,
}: {
  color: string | undefined;
  coordinates: CursorCoordinates;
  label: string | undefined;
  layerRect: Rect | undefined;
  sampleTime: number | undefined;
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const previousSampleRef = useRef<CursorSample>();
  const { x, y } = coordinates;
  const layerWidth = layerRect?.width;
  const layerHeight = layerRect?.height;

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (element === null) {
      return;
    }
    const currentSample = {
      x,
      y,
      time: sampleTime ?? Date.now(),
    };
    const predictionLayerRect =
      layerWidth === undefined || layerHeight === undefined
        ? undefined
        : { left: 0, top: 0, width: layerWidth, height: layerHeight };
    const prediction = computePredictedCursor({
      current: currentSample,
      previous: previousSampleRef.current,
      layerRect: predictionLayerRect,
    });
    element.style.transform = `translate3d(${prediction.coordinates.x}px, ${prediction.coordinates.y}px, 0)`;
    previousSampleRef.current = {
      ...currentSample,
      velocity: prediction.velocity,
    };
  }, [x, y, layerHeight, layerWidth, sampleTime]);

  return (
    <div
      ref={elementRef}
      className={cursorStyle()}
      style={{
        color,
      }}
    >
      <svg
        width="14"
        height="20"
        viewBox="0 0 14 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1 1.5L1 17.7L4.8 13.4L8 19L11 17.4L7.8 11.8L13 11.8L1 1.5Z"
          fill="currentColor"
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      {label && (
        <div className={cursorLabelStyle()} style={{ backgroundColor: color }}>
          {label}
        </div>
      )}
    </div>
  );
};

export const CollaborativeCursors = () => {
  const collaborators = useStore($collaborators);
  const canvasRect = useStore($canvasRect);
  const currentPageId = useStore($selectedPageId);
  const [layerElement, setLayerElement] = useState<
    HTMLDivElement | null | undefined
  >(undefined);
  const layerRect = layerElement?.getBoundingClientRect();
  const collaboratorColors = useMemo(
    () => assignCollaboratorColors(collaborators.keys()),
    [collaborators]
  );

  useEffect(() => {
    const collaborativeSelection = [...collaborators.values()].find(
      (collaborator) => {
        if (
          shouldSkipCollaborator({
            currentPageId,
            collaboratorPageId: collaborator.pageId,
          })
        ) {
          return false;
        }
        return (
          collaborator.selectedInstanceIds !== undefined &&
          collaborator.selectedInstanceIds.length > 0
        );
      }
    )?.selectedInstanceIds;

    const currentCollaborativeSelection = $collaborativeInstanceSelector.get();
    if (
      areInstanceSelectorsEqual(
        currentCollaborativeSelection,
        collaborativeSelection
      )
    ) {
      return;
    }

    $collaborativeInstanceSelector.set(collaborativeSelection);
  }, [collaborators, currentPageId]);

  return (
    <div className={layerStyle()} ref={setLayerElement}>
      {[...collaborators.entries()].map(([clientId, collaborator]) => {
        const coordinates = toRenderableCollaboratorCursor({
          currentPageId,
          collaboratorPageId: collaborator.pageId,
          pointerPosition: collaborator.pointerPosition,
          layerRect,
          canvasRect,
        });

        if (coordinates === undefined) {
          return;
        }

        const color = collaboratorColors.get(clientId);
        const label = getCollaboratorLabel(collaborator);

        return (
          <CollaborativeCursor
            key={clientId}
            color={color}
            coordinates={coordinates}
            label={label}
            layerRect={layerRect}
            sampleTime={collaborator.lastSeen}
          />
        );
      })}
    </div>
  );
};

export const __testing__ = {
  getCollaboratorLabel,
  computePredictedCursor,
  shouldSkipCollaborator,
  hasCursorPosition,
  computeCursorCoordinates,
  isWithinLayer,
  toRenderableCollaboratorCursor,
};
