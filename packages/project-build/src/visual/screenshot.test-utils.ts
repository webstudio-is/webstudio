import { writeFile } from "node:fs/promises";
import { encode, type ImageData } from "fast-png";
import type { ScreenshotDiffRgb } from "./screenshot-diff";

export const createPng = (
  width: number,
  height: number,
  color: ScreenshotDiffRgb
) => {
  const png: ImageData = {
    width,
    height,
    data: new Uint8Array(width * height * 4),
    depth: 8,
    channels: 4,
  };
  paintRect(png, { x: 0, y: 0, width, height }, color);
  return png;
};

export const paintRect = (
  png: ImageData,
  rect: { x: number; y: number; width: number; height: number },
  color: ScreenshotDiffRgb
) => {
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      const offset = (png.width * y + x) * 4;
      png.data[offset] = color.r;
      png.data[offset + 1] = color.g;
      png.data[offset + 2] = color.b;
      png.data[offset + 3] = 255;
    }
  }
};

export const writePng = async (filePath: string, png: ImageData) => {
  await writeFile(filePath, encode(png));
};
