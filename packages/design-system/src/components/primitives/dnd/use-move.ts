/* eslint-disable prefer-const */
/* eslint-disable func-style */
/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * We had to copy this file from react-aria because we need clientX and clientY.
 */

import { useMemo, useRef } from "react";
import { useGlobalListeners } from "@react-aria/utils";

interface MoveResult {
  onPointerDown: (e: PointerEvent) => void;
}

interface EventBase {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

export type PointerType = "mouse" | "pen" | "touch" | "keyboard" | "virtual";

interface BaseMoveEvent {
  /** The pointer type that triggered the move event. */
  pointerType: PointerType;
  /** Whether the shift keyboard modifier was held during the move event. */
  shiftKey: boolean;
  /** Whether the ctrl keyboard modifier was held during the move event. */
  ctrlKey: boolean;
  /** Whether the meta keyboard modifier was held during the move event. */
  metaKey: boolean;
  /** Whether the alt keyboard modifier was held during the move event. */
  altKey: boolean;
}

interface MoveStartEvent extends BaseMoveEvent {
  /** The type of move event being fired. */
  type: "movestart";
  target: HTMLElement;
  clientX: number;
  clientY: number;
}

interface MoveMoveEvent extends BaseMoveEvent {
  /** The type of move event being fired. */
  type: "move";
  /** The amount moved in the X direction since the last event. */
  deltaX: number;
  /** The amount moved in the Y direction since the last event. */
  deltaY: number;
  clientX: number;
  clientY: number;
}

interface MoveEndEvent extends BaseMoveEvent {
  /** The type of move event being fired. */
  type: "moveend";
}

interface MoveEvents {
  shouldStart: (e: PointerEvent) => boolean;

  /** Handler that is called when a move interaction starts. */
  onMoveStart?: (e: MoveStartEvent) => void;
  /** Handler that is called when the element is moved. */
  onMove?: (e: MoveMoveEvent) => void;
  /** Handler that is called when a move interaction ends. */
  onMoveEnd?: (e: MoveEndEvent) => void;
}

/**
 * Handles move interactions across mouse, touch, and keyboard, including dragging with
 * the mouse or touch, and using the arrow keys. Normalizes behavior across browsers and
 * platforms, and ignores emulated mouse events on touch devices.
 */
export function useMove(props: MoveEvents): MoveResult {
  let state = useRef<{
    didMove: boolean;
    lastPosition: { pageX: number; pageY: number } | null;
    id: number | null;
  }>({ didMove: false, lastPosition: null, id: null });

  let { addGlobalListener, removeGlobalListener } = useGlobalListeners();

  // Because addGlobalListener is used to set callbacks,
  // noramlly it will "see" the version of "props" at the time of addGlobalListener call.
  // This in turn means that user's callbakcs will see old state variables etc.
  // To workaround this, we use a ref that always points to the latest props.
  let latestProps = useRef<MoveEvents>(props);
  latestProps.current = props;

  let moveResult = useMemo(() => {
    let start = () => {
      state.current.didMove = false;
    };
    let move = (
      originalEvent: PointerEvent,
      pointerType: PointerType,
      deltaX: number,
      deltaY: number
    ) => {
      if (deltaX === 0 && deltaY === 0) {
        return;
      }

      if (
        !state.current.didMove &&
        originalEvent.target instanceof HTMLElement
      ) {
        state.current.didMove = true;
        latestProps.current.onMoveStart?.({
          type: "movestart",
          pointerType,
          shiftKey: originalEvent.shiftKey,
          metaKey: originalEvent.metaKey,
          ctrlKey: originalEvent.ctrlKey,
          altKey: originalEvent.altKey,
          target: originalEvent.target,
          clientX: originalEvent.clientX,
          clientY: originalEvent.clientY,
        });
      }

      latestProps.current.onMove?.({
        type: "move",
        pointerType,
        deltaX: deltaX,
        deltaY: deltaY,
        shiftKey: originalEvent.shiftKey,
        metaKey: originalEvent.metaKey,
        ctrlKey: originalEvent.ctrlKey,
        altKey: originalEvent.altKey,
        clientX: originalEvent.clientX,
        clientY: originalEvent.clientY,
      });
    };
    let end = (originalEvent: EventBase, pointerType: PointerType) => {
      if (state.current.didMove) {
        latestProps.current.onMoveEnd?.({
          type: "moveend",
          pointerType,
          shiftKey: originalEvent.shiftKey,
          metaKey: originalEvent.metaKey,
          ctrlKey: originalEvent.ctrlKey,
          altKey: originalEvent.altKey,
        });
      }
    };

    let onPointerMove = (event: PointerEvent) => {
      if (
        event.pointerId === state.current.id &&
        state.current.lastPosition !== null
      ) {
        let pointerType = (event.pointerType || "mouse") as PointerType;

        // Problems with PointerEvent#movementX/movementY:
        // 1. it is always 0 on macOS Safari.
        // 2. On Chrome Android, it's scaled by devicePixelRatio, but not on Chrome macOS
        move(
          event,
          pointerType,
          event.pageX - state.current.lastPosition.pageX,
          event.pageY - state.current.lastPosition.pageY
        );
        state.current.lastPosition = { pageX: event.pageX, pageY: event.pageY };
      }
    };

    let onPointerUp = (event: PointerEvent) => {
      if (event.pointerId === state.current.id) {
        let pointerType = (event.pointerType || "mouse") as PointerType;
        end(event, pointerType);
        state.current.id = null;
        removeGlobalListener(window, "pointermove", onPointerMove, false);
        removeGlobalListener(window, "pointerup", onPointerUp, false);
        removeGlobalListener(window, "pointercancel", onPointerUp, false);
      }
    };

    return {
      onPointerDown: (event: PointerEvent) => {
        if (
          event.button === 0 &&
          state.current.id == null &&
          latestProps.current.shouldStart(event)
        ) {
          start();
          event.stopPropagation();
          event.preventDefault();
          state.current.lastPosition = {
            pageX: event.pageX,
            pageY: event.pageY,
          };
          state.current.id = event.pointerId;
          addGlobalListener(window, "pointermove", onPointerMove, false);
          addGlobalListener(window, "pointerup", onPointerUp, false);
          addGlobalListener(window, "pointercancel", onPointerUp, false);
        }
      },
    };
  }, [addGlobalListener, removeGlobalListener]);

  return moveResult;
}
