import { webcrypto as crypto } from "node:crypto";

export const cnameFromUserId = async (userId: string) => {
  const vowels = ["a", "e", "i", "o", "u"];
  const consonants = [
    "b",
    "c",
    "d",
    "f",
    "g",
    "h",
    "j",
    "k",
    "l",
    "m",
    "n",
    "p",
    "q",
    "r",
    "s",
    "t",
    "v",
    "w",
    "x",
    "y",
    "z",
  ];

  const secretBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(userId)
  );

  let result = "";

  const array = new Uint8Array(secretBuffer);
  const wordsLength = [
    Math.max(4, array[0] % 7),
    Math.max(4, array[0] % 7),
    Math.max(4, array[0] % 7),
  ];

  let wordIndex = 0;
  let wordLength = wordsLength[wordIndex];

  for (let i = 0; i < array.length; i++) {
    result +=
      i % 2 === 0
        ? consonants[array[i] % consonants.length]
        : vowels[array[i] % vowels.length];
    if (i >= wordLength) {
      wordIndex++;
      if (wordIndex >= wordsLength.length) {
        break;
      }
      result += "-";
      wordLength += wordsLength[wordIndex];
    }
  }

  return result;
};
