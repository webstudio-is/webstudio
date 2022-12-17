import { describe, test, expect } from "@jest/globals";
import { getSpeed } from "./use-auto-scroll";

describe("getSpeed", () => {
  const CONTAINER_START = 0;
  const CONTAINER_END = 100;
  const EDGE_DISTANCE_THRESHOLD = 10;
  const MIN_SPEED = 0;
  const MAX_SPEED = 10;

  test("speed is never over mod(maxSpeed)", () => {
    expect(
      getSpeed(
        CONTAINER_END + 100,
        CONTAINER_START,
        CONTAINER_END,
        EDGE_DISTANCE_THRESHOLD,
        MIN_SPEED,
        MAX_SPEED
      )
    ).toBe(MAX_SPEED);
    expect(
      getSpeed(
        CONTAINER_START - 100,
        CONTAINER_START,
        CONTAINER_END,
        EDGE_DISTANCE_THRESHOLD,
        MIN_SPEED,
        MAX_SPEED
      )
    ).toBe(-MAX_SPEED);
  });

  test("when at the middle of container, speed is minSpeed", () => {
    expect(
      getSpeed(
        CONTAINER_START + (CONTAINER_END - CONTAINER_START) / 2,
        CONTAINER_START,
        CONTAINER_END,
        EDGE_DISTANCE_THRESHOLD,
        MIN_SPEED,
        MAX_SPEED
      )
    ).toBe(MIN_SPEED);
  });

  test("when within the edgeDistanceThreshold bounds, speed is minSpeed", () => {
    expect(
      getSpeed(
        CONTAINER_END - EDGE_DISTANCE_THRESHOLD - 1,
        CONTAINER_START,
        CONTAINER_END,
        EDGE_DISTANCE_THRESHOLD,
        MIN_SPEED,
        MAX_SPEED
      )
    ).toBe(MIN_SPEED);

    expect(
      getSpeed(
        CONTAINER_START + EDGE_DISTANCE_THRESHOLD + 1,
        CONTAINER_START,
        CONTAINER_END,
        EDGE_DISTANCE_THRESHOLD,
        MIN_SPEED,
        MAX_SPEED
      )
    ).toBe(MIN_SPEED);
  });

  test.each([0.2, 0.3, 0.9])(
    "speed is proportional to how close the pointer is to the edge (proportion=%d)",
    (proportion) => {
      expect(
        getSpeed(
          CONTAINER_END - EDGE_DISTANCE_THRESHOLD * (1 - proportion),
          CONTAINER_START,
          CONTAINER_END,
          EDGE_DISTANCE_THRESHOLD,
          MIN_SPEED,
          MAX_SPEED
        )
      ).toBe(MIN_SPEED + (MAX_SPEED - MIN_SPEED) * proportion);

      expect(
        getSpeed(
          CONTAINER_START + EDGE_DISTANCE_THRESHOLD * (1 - proportion),
          CONTAINER_START,
          CONTAINER_END,
          EDGE_DISTANCE_THRESHOLD,
          MIN_SPEED,
          MAX_SPEED
        )
      ).toBe((MIN_SPEED + (MAX_SPEED - MIN_SPEED) * proportion) * -1);
    }
  );
});
