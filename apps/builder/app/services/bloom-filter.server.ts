import invariant from "tiny-invariant";

const hash = async (input: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return hashBuffer;
};

const SHA_SIZE = 32;

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

    invariant(
      SHA_SIZE >= this.numHashes * 2,
      "numHashes is too large, we are using SHA-256"
    );

    invariant(
      bitSize < 0xffff,
      `bitSize=${bitSize} is too large, hash is 16-bit`
    );

    const size = Math.ceil(bitSize / 8);

    this.bitArray = new Uint8Array(size);
  }

  async add(item: string) {
    const hashes = await this.#getHashes(item);
    const size = this.bitArray.length * 8;

    for (const hash of hashes) {
      setBit(this.bitArray, hash % size);
    }
  }

  async has(item: string) {
    const hashes = await this.#getHashes(item);
    const size = this.bitArray.length * 8;

    return hashes.every((hash) => getBit(this.bitArray, hash % size) === 1);
  }

  async #getHashes(item: string): Promise<number[]> {
    const hashes: number[] = [];
    const hashBuffer = await hash(item);
    const hashView = new DataView(hashBuffer);

    invariant(
      hashBuffer.byteLength > this.numHashes * 2,
      "numHashes is too large"
    );

    for (let i = 0; i < this.numHashes; i++) {
      const hashValue = hashView.getUint16(i * 2, true);

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
