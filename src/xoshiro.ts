import { sha256Hash } from "./utils";
import BigNumber from 'bignumber.js'

const xoshiro = require('xoshiro');

const MAX_UINT64 = 0xFFFFFFFFFFFFFFFF;

export default class Xoshiro {
  rng: any;

  constructor(seed: Buffer) {
    const digest = sha256Hash(seed);
    this.rng = xoshiro.create('256**', digest)
  }

  next = (): BigNumber => {
    const value = this.rng.roll();

    return new BigNumber(value)
  }

  nextDouble = (): BigNumber => {
    const value = this.rng.roll();

    return new BigNumber(value).div(MAX_UINT64 + 1)
  }

  nextInt = (low: number, high: number): number => {
    return Math.floor((this.nextDouble().toNumber() * (high - low + 1)) + low);
  }

  nextByte = () => this.nextInt(0, 255);

  nextData = (count: number) => (
    [...new Array(count)].map(() => this.nextByte())
  )
}
