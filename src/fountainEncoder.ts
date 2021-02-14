import assert from "assert";
import cbor from 'cbor';
import xor from 'buffer-xor';
import { getCRC, split } from "./utils";
import { chooseFragments } from "./fountainUtils";

export class FountainEncoderPart {
  constructor(
    private _seqNum: number,
    private _seqLength: number,
    private _messageLength: number,
    private _checksum: number,
    private _fragment: Buffer,
  ) { }

  get messageLength() { return this._messageLength; }
  get fragment() { return this._fragment; }
  get seqNum() { return this._seqNum; }
  get seqLength() { return this._seqLength; }
  get checksum() { return this._checksum; }

  public cbor(): Buffer {
    const result = cbor.encode([
      this._seqNum,
      this._seqLength,
      this._messageLength,
      this._checksum,
      this._fragment
    ])

    return result;
  }

  public description(): string {
    return `seqNum:${this._seqNum}, seqLen:${this._seqLength}, messageLen:${this._messageLength}, checksum:${this._checksum}, data:${this._fragment.toString('hex')}`
  }

  public static fromCBOR(cborPayload: string | Buffer) {
    const [
      seqNum,
      seqLength,
      messageLength,
      checksum,
      fragment,
    ] = cbor.decode(cborPayload);

    assert(typeof seqNum === 'number');
    assert(typeof seqLength === 'number');
    assert(typeof messageLength === 'number');
    assert(typeof checksum === 'number');
    assert(Buffer.isBuffer(fragment));

    return new FountainEncoderPart(
      seqNum,
      seqLength,
      messageLength,
      checksum,
      fragment,
    )
  }
}

export default class FountainEncoder {
  private messageLength: number;
  private fragments: Buffer[];
  private fragmentLength: number;
  private seqNum: number;
  private checksum: number;

  constructor(
    message: Buffer,
    maxFragmentLength: number = 100,
    firstSeqNum: number = 0,
    minFragmentLength: number = 10
  ) {
    const fragmentLength = FountainEncoder.findNominalFragmentLength(message.length, minFragmentLength, maxFragmentLength);

    this.messageLength = message.length;
    this.fragments = FountainEncoder.partitionMessage(message, fragmentLength);
    this.fragmentLength = fragmentLength;
    this.seqNum = firstSeqNum;
    this.checksum = getCRC(message)
  }

  public isComplete(): boolean {
    return this.seqNum >= this.fragments.length;
  }

  public isSinglePart(): boolean {
    return this.fragments.length === 1;
  }

  public seqLength(): number {
    return this.fragments.length;
  }

  public mix(indexes: number[]) {
    return indexes.reduce(
      (result, index) => xor(this.fragments[index], result),
      Buffer.alloc(this.fragmentLength, 0)
    )
  }

  public nextPart(): FountainEncoderPart {
    this.seqNum += 1;

    const indexes = chooseFragments(this.seqNum, this.fragments.length, this.checksum);
    const mixed = this.mix(indexes);

    return new FountainEncoderPart(
      this.seqNum,
      this.fragments.length,
      this.messageLength,
      this.checksum,
      mixed
    )
  }

  public static findNominalFragmentLength(
    messageLength: number,
    minFragmentLength: number,
    maxFragmentLength: number
  ): number {
    assert(messageLength > 0)
    assert(minFragmentLength > 0)
    assert(maxFragmentLength >= minFragmentLength)

    const maxFragmentCount = Math.ceil(messageLength / minFragmentLength);
    let fragmentLength = 0;

    for (let fragmentCount = 1; fragmentCount <= maxFragmentCount; fragmentCount++) {
      fragmentLength = Math.ceil(messageLength / fragmentCount);

      if (fragmentLength <= maxFragmentLength) {
        break;
      }
    }

    return fragmentLength;
  }

  public static partitionMessage(message: Buffer, fragmentLength: number): Buffer[] {
    let remaining = Buffer.from(message);
    let fragment;
    let fragments: Buffer[] = [];

    while (remaining.length > 0) {
      [fragment, remaining] = split(remaining, -fragmentLength)
      fragment = Buffer
        .alloc(fragmentLength, 0) // initialize with 0's to achieve the padding
        .fill(fragment, 0, fragment.length)
      fragments.push(fragment)
    }

    return fragments;
  }
}

