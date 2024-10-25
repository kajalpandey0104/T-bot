import { decodeFileId, decodeUniqFileId } from "./index";
import Util from "./Util";
import FileId from "./FileId";

class FileUniqId {
  constructor() {
    this.type = 0;
    this.id = undefined; // Optional
    this.volumeId = undefined; // Optional
    this.localId = undefined; // Optional
    this.url = undefined; // Optional
  }

  static fromFileId(fileId) {
    const result = decodeFileId(fileId);
    return FileUniqId.buildFromDecode(result);
  }

  static buildFromDecode(decoded) {
    const inst = new FileUniqId();
    inst.id = decoded.id;
    inst.volumeId = decoded.volumeId;
    inst.localId = decoded.localId;
    inst.url = decoded.url;
    inst.type = decoded.typeId;
    return inst;
  }

  static fromFileUniqId(fileUniqId) {
    const result = decodeUniqFileId(fileUniqId);
    return FileUniqId.buildFromDecode(result);
  }

  static fromFileIdInstance(instance) {
    const inst = new FileUniqId();
    inst.id = instance.id;
    inst.volumeId = instance.volumeId;
    inst.localId = instance.localId;
    inst.url = instance.url;
    inst.type = instance.typeId;
    return inst;
  }

  toFileUniqId() {
    let out = Util.to32bitBuffer(this.type);

    if (this.type === Util.UNIQUE_WEB && this.url) {
      out += Util.packTLString(Buffer.from(this.url));
    } else if (this.type === Util.UNIQUE_PHOTO && this.volumeId && this.localId) {
      out += Util.to64bitBuffer(this.volumeId);
      out += Util.to32bitSignedBuffer(this.localId);
    } else if (this.id) {
      out += Util.to64bitBuffer(this.id);
    }

    return Util.base64UrlEncode(Util.rleEncode(out));
  }
}

export default FileUniqId;
