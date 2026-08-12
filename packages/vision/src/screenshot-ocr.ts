/**
 * Adapted from Software Mansion Argent's screenshot-diff OCR implementation.
 * Source: https://github.com/software-mansion/argent/tree/main/packages/tool-server/src/tools/screenshot-diff
 * License: Apache-2.0
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ScreenshotDiffBounds } from "./screenshot-diff";

const execFileAsync = promisify(execFile);

const OCR_TIMEOUT_MS = 10_000;
const OCR_MAX_BUFFER_BYTES = 32 * 1024 * 1024;
const TESSERACT_BINARY = "tesseract";
const TESSERACT_LANGUAGE = "eng";
const TESSERACT_PSM_SPARSE_TEXT = "11";
const TESSERACT_OEM_LSTM_ONLY = "1";
const REQUIRED_TSV_HEADERS = [
  "level",
  "page_num",
  "block_num",
  "par_num",
  "line_num",
  "word_num",
  "left",
  "top",
  "width",
  "height",
  "conf",
  "text",
] as const;

type TsvHeader = (typeof REQUIRED_TSV_HEADERS)[number];

type OcrWord = {
  text: string;
  confidence: number;
  bounds: ScreenshotDiffBounds;
  blockNum: number;
  parNum: number;
  lineNum: number;
  wordNum: number;
};

export type OcrTextBlock = {
  text: string;
  confidence: number;
  bounds: ScreenshotDiffBounds;
  words: OcrWord[];
};

export type OcrExtractionResult = {
  status: "ok" | "unavailable";
  provider: "tesseract";
  blocks: OcrTextBlock[];
};

export const extractOcrTextBlocks = async (
  imagePath: string
): Promise<OcrExtractionResult> => {
  try {
    const tsv = await recognizeTsv(imagePath);
    return {
      status: "ok",
      provider: "tesseract",
      blocks: parseTesseractTsv(tsv),
    };
  } catch {
    return {
      status: "unavailable",
      provider: "tesseract",
      blocks: [],
    };
  }
};

export const parseTesseractTsv = (tsv: string): OcrTextBlock[] => {
  const [headerLine, ...lines] = tsv.split(/\r?\n/);
  if (headerLine === undefined) {
    return [];
  }

  const normalizedHeaderLine = headerLine.replace(/^\uFEFF/u, "");
  const hasHeader = isHeaderlessTsvDataRow(normalizedHeaderLine) === false;
  const headers = hasHeader
    ? normalizedHeaderLine.split("\t")
    : [...REQUIRED_TSV_HEADERS];
  const dataLines = hasHeader ? lines : [normalizedHeaderLine, ...lines];
  const indexByName = new Map(headers.map((header, index) => [header, index]));
  validateTsvHeaders(indexByName);

  const wordsByLine = new Map<string, OcrWord[]>();
  for (const line of dataLines) {
    if (line.trim() === "") {
      continue;
    }
    const values = line.split("\t");
    const level = readTsvNumber(values, indexByName, "level");
    const text = readTsvString(values, indexByName, "text").trim();
    const confidence = readTsvNumber(values, indexByName, "conf");
    if (level !== 5 || confidence < 0 || isMeaningfulText(text) === false) {
      continue;
    }

    const bounds = {
      x: readTsvNumber(values, indexByName, "left"),
      y: readTsvNumber(values, indexByName, "top"),
      width: readTsvNumber(values, indexByName, "width"),
      height: readTsvNumber(values, indexByName, "height"),
    };
    if (bounds.width <= 0 || bounds.height <= 0) {
      continue;
    }

    const blockNum = readTsvNumber(values, indexByName, "block_num");
    const parNum = readTsvNumber(values, indexByName, "par_num");
    const lineNum = readTsvNumber(values, indexByName, "line_num");
    const wordNum = readTsvNumber(values, indexByName, "word_num");
    const key = [blockNum, parNum, lineNum].join(":");
    const word = {
      text,
      confidence: confidence / 100,
      bounds,
      blockNum,
      parNum,
      lineNum,
      wordNum,
    };
    const existing = wordsByLine.get(key);
    if (existing === undefined) {
      wordsByLine.set(key, [word]);
    } else {
      existing.push(word);
    }
  }

  return Array.from(wordsByLine.values()).map(toTextBlock);
};

const recognizeTsv = async (imagePath: string): Promise<string> => {
  const { stdout } = await execFileAsync(
    TESSERACT_BINARY,
    [
      imagePath,
      "stdout",
      "-l",
      TESSERACT_LANGUAGE,
      "--oem",
      TESSERACT_OEM_LSTM_ONLY,
      "--psm",
      TESSERACT_PSM_SPARSE_TEXT,
      "tsv",
    ],
    { timeout: OCR_TIMEOUT_MS, maxBuffer: OCR_MAX_BUFFER_BYTES }
  );
  return stdout;
};

const toTextBlock = (words: OcrWord[]): OcrTextBlock => {
  const sortedWords = [...words].sort(
    (left, right) => left.wordNum - right.wordNum
  );
  return {
    text: sortedWords.map((word) => word.text).join(" "),
    confidence: average(sortedWords.map((word) => word.confidence)),
    bounds: unionBounds(sortedWords.map((word) => word.bounds)),
    words: sortedWords,
  };
};

const validateTsvHeaders = (indexByName: Map<string, number>) => {
  for (const header of REQUIRED_TSV_HEADERS) {
    if (indexByName.has(header) === false) {
      throw new Error(`Tesseract TSV output is missing "${header}".`);
    }
  }
};

const readTsvNumber = (
  values: string[],
  indexByName: Map<string, number>,
  name: TsvHeader
) => {
  const value = Number(values[indexByName.get(name) ?? -1]);
  if (Number.isFinite(value) === false) {
    throw new Error(`Tesseract TSV field "${name}" is not a finite number.`);
  }
  return value;
};

const readTsvString = (
  values: string[],
  indexByName: Map<string, number>,
  name: TsvHeader
) => values[indexByName.get(name) ?? -1] ?? "";

const isHeaderlessTsvDataRow = (line: string) => {
  const [level, pageNum] = line.split("\t", 2);
  return isFiniteTsvNumber(level) && isFiniteTsvNumber(pageNum);
};

const isFiniteTsvNumber = (value: string | undefined) =>
  value !== undefined && value.trim() !== "" && Number.isFinite(Number(value));

const isMeaningfulText = (text: string) => /[\p{L}\p{N}]/u.test(text);

const unionBounds = (bounds: ScreenshotDiffBounds[]): ScreenshotDiffBounds => {
  const minX = Math.min(...bounds.map((bound) => bound.x));
  const minY = Math.min(...bounds.map((bound) => bound.y));
  const maxX = Math.max(...bounds.map((bound) => bound.x + bound.width));
  const maxY = Math.max(...bounds.map((bound) => bound.y + bound.height));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

const average = (values: number[]) =>
  values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
