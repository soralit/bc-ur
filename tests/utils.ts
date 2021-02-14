import cbor from "cbor";
import { UR } from "../src/ur";
import Xoshiro from "../src/xoshiro";

export const makeMessage = (length: number, seed: string = 'Wolf'): Buffer => {
  const rng = new Xoshiro(Buffer.from(seed));

  return Buffer.from(rng.nextData(length));
}

export const makeMessageUR = (length: number, seed: string = 'Wolf'): UR => {
  const message = makeMessage(length, seed);

  const cborMessage = cbor.encode(message);

  return new UR(cborMessage);
}