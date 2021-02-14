import { type } from "os";
import { InvalidTypeError } from "./errors";
import { isURType } from "./utils";

export class UR {
  constructor(
    private _cborPayload: Buffer,
    private _type: string = 'bytes'
  ) {
    if (!isURType(this._type)) {
      throw new InvalidTypeError();
    }
  }

  get type() { return this._type; }
  get cbor() { return this._cborPayload; }

  public equals(ur2: UR) {
    return this.type === ur2.type && this.cbor.equals(ur2.cbor);
  }
}