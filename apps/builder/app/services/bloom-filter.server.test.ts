import { test, expect, describe, beforeEach } from "vitest";
import { BloomFilter } from "./bloom-filter.server";

describe("BloomFilter add/has", () => {
  let bloomFilter: BloomFilter;

  beforeEach(() => {
    bloomFilter = new BloomFilter(100, 0.01);
  });

  test("should initialize correctly", () => {
    expect(bloomFilter.numHashes).toBeGreaterThan(0);
    expect(bloomFilter.bitArray.length).toBeGreaterThan(0);
  });

  test("should add an item and check its existence", () => {
    const item = "test-item";
    bloomFilter.add(item);
    const hasItem = bloomFilter.has(item);
    expect(hasItem).toBe(true);
  });

  test("should return false for non-existent items", () => {
    const item = "non-existent-item";
    const hasItem = bloomFilter.has(item);
    expect(hasItem).toBe(false);
  });

  test("should handle adding the same item multiple times", () => {
    const item = "duplicate-item";
    bloomFilter.add(item);
    bloomFilter.add(item);
    const hasItem = bloomFilter.has(item);
    expect(hasItem).toBe(true);
  });

  test("should handle multiple items", () => {
    const items = ["item1", "item2", "item3"];
    for (const item of items) {
      bloomFilter.add(item);
    }

    for (const item of items) {
      const hasItem = bloomFilter.has(item);
      expect(hasItem).toBe(true);
    }

    const notExistedItems = ["na-item1", "na-item2", "na-item3"];
    for (const item of notExistedItems) {
      const hasItem = bloomFilter.has(item);
      expect(hasItem).toBe(false);
    }
  });
});

describe("BloomFilter serialize/deserialize", () => {
  let bloomFilter: BloomFilter;

  beforeEach(() => {
    bloomFilter = new BloomFilter(100, 0.01);
  });

  test("should serialize and deserialize correctly", () => {
    const items = ["item1", "item2", "item3", "item4", "item5"];

    for (const item of items) {
      bloomFilter.add(item);
    }

    const serialized = bloomFilter.serialize();
    const deserialized = BloomFilter.deserialize(serialized);

    expect(deserialized.numHashes).toBe(bloomFilter.numHashes);
    expect(deserialized.bitArray).toEqual(bloomFilter.bitArray);
  });
});

describe("BloomFilter size", () => {
  test("Visual test bloom filter size", () => {
    const bloomFilter = new BloomFilter(100, 0.02);
    for (let i = 0; i < 20; i++) {
      bloomFilter.add(i.toString());
    }

    const serialized = bloomFilter.serialize();
    expect(serialized).toMatchInlineSnapshot(
      `"AAABKACCAIQICCAAFFIAEUAEKANBBoAJEAGAAAGAgIgAAIGCAIwCAABBIAgEgBBAAIAAUEAAQRAAiCAAEgAAEggAEkMgEAECAAjAAABighAAgEoAEEDEJGAgQAABATgIAEAQCAAQBg"`
    );
  });

  test("Visual test bloom filter size", () => {
    const bloomFilter = new BloomFilter(50, 0.02);
    for (let i = 0; i < 20; i++) {
      bloomFilter.add(i.toString());
    }

    const serialized = bloomFilter.serialize();
    expect(serialized).toMatchInlineSnapshot(
      `"UEABaRCCiKQIGiAAFloAE0MkOANDBojJEAHighGAgMoAEMHGJOwiQABBITgMgFBQCIAQBg"`
    );
  });
});

describe("real life test", () => {
  test.each([50, 100])("should work with real life data", (maxItems) => {
    const falsePositiveProbability = 0.02;

    const bloomFilter = new BloomFilter(maxItems, falsePositiveProbability);

    // Fill with maxItems with 2/3
    const uuids = Array.from(Array(Math.ceil((maxItems * 2) / 3)), () =>
      crypto.randomUUID()
    );
    for (const uuid of uuids) {
      bloomFilter.add(uuid);
    }

    for (const uuid of uuids) {
      expect(bloomFilter.has(uuid)).toBe(true);
    }

    let falsePositives = 0;

    const notInSetCount = 1000;

    const notInSetUuid = Array.from(Array(notInSetCount), () =>
      crypto.randomUUID()
    );

    for (const uuid of notInSetUuid) {
      const isInSet = bloomFilter.has(uuid);
      falsePositives += isInSet ? 1 : 0;
    }

    /*
    // Uncomment to play with parameters
    console.info(
      "False positives",
      falsePositives,
      "of",
      notInSetUuid.length,
      bloomFilter.serialize().length
    );
    */

    expect(falsePositives).toBeLessThan(
      notInSetCount * falsePositiveProbability
    );
  });
});
