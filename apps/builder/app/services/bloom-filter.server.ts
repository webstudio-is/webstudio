const fnv1a = (input: string): number => {
  const prime = 0x01000193;
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, prime);
  }

  return hash >>> 0; // Convert to 32-bit unsigned integer
};

const getBit = (arr: Uint8Array, i: number) => (arr[i >> 3] >> (i & 7)) & 1;

const setBit = (arr: Uint8Array, i: number) => {
  arr[i >> 3] = arr[i >> 3] | (1 << (i & 7));
};

export class BloomFilter {
  numHashes: number;
  bitArray: Uint8Array;

  constructor(maxItems: number, falsePositiveProbability: number) {
    if (maxItems === 0) {
      this.numHashes = 0;
      this.bitArray = new Uint8Array(0);
      return;
    }

    const bitSize = Math.ceil(
      (maxItems * Math.log(falsePositiveProbability)) /
        Math.log(1 / Math.pow(2, Math.log(2)))
    );

    this.numHashes = Math.round((bitSize / maxItems) * Math.log(2));

    const size = Math.ceil(bitSize / 8);

    this.bitArray = new Uint8Array(size);
  }

  add(item: string) {
    const hashes = this.#getHashes(item);
    const size = this.bitArray.length * 8;

    for (const hash of hashes) {
      setBit(this.bitArray, hash % size);
    }
  }

  has(item: string) {
    const hashes = this.#getHashes(item);
    const size = this.bitArray.length * 8;

    return hashes.every((hash) => getBit(this.bitArray, hash % size) === 1);
  }

  #getHashes(item: string): number[] {
    const hashes: number[] = [];
    let value = item;
    for (let i = 0; i < this.numHashes; i++) {
      const hashValue = fnv1a(value);
      value = hashValue.toString();

      hashes.push(hashValue);
    }

    return hashes;
  }

  serialize(): string {
    return Buffer.concat([
      Buffer.from(this.bitArray),
      Buffer.from([this.numHashes]),
    ]).toString("base64url");
  }

  static deserialize(serialized: string): BloomFilter {
    const buffer = Buffer.from(serialized, "base64url");
    const numHashes = buffer[buffer.length - 1];
    const bitArray = buffer.subarray(0, buffer.length - 1);

    const filter = new BloomFilter(0, 0);
    filter.numHashes = numHashes;
    filter.bitArray = new Uint8Array(bitArray);

    return filter;
  }
}
