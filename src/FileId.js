import { decodeFileId } from "./index";
import Util from "./Util";
import FileUniqId from "./FileUniqId";

class FileId {
  constructor() {
    this.version = 0;
    this.subVersion = 0;
    this.dcId = 0;
    this.typeId = 0;
    this.fileType = ''; // Can be a string or number
    this.fileReference = undefined; // Optional
    this.url = undefined; // Optional
    this.id = BigInt(0);
    this.accessHash = BigInt(0);
    this.volumeId = BigInt(0); // Optional
    this.localId = 0; // Optional, can be number or bigint
    this.photoSizeSource = undefined; // Optional, legacy, thumbnail, dialogPhoto, stickerSetThumbnail
    this.photoSizeSourceId = undefined; // Optional
    this.secret = undefined; // Optional, bigint or number
    this.dialogId = undefined; // Optional, can be number or bigint
    this.dialogAccessHash = undefined; // Optional, can be number or bigint
    this.isSmallDialogPhoto = undefined; // Optional, boolean

    this.stickerSetId = undefined; // Optional, can be number or bigint
    this.stickerSetAccessHash = undefined; // Optional, can be number or bigint

    this.thumbType = undefined; // Optional, string
    this.thumbTypeId = undefined; // Optional, number
  }

  static fromFileId(fileId) {
    try {
      const decoded = decodeFileId(fileId);
      const inst = new FileId();
      inst.version = decoded.version;
      inst.subVersion = decoded.subVersion;
      inst.dcId = decoded.dcId;
      inst.typeId = decoded.typeId;
      inst.fileType = decoded.fileType;

      if (decoded.hasReference) {
        inst.fileReference = decoded.fileReference;
      }
      if (decoded.hasWebLocation) {
        inst.url = decoded.url;
        return inst;
      }

      inst.id = decoded.id;
      inst.accessHash = decoded.access_hash;

      if (decoded.typeId <= 2) {
        inst.volumeId = decoded.volumeId;
        inst.localId = decoded.localId;
        inst.photoSizeSourceId = decoded.photoSizeSource;

        switch (inst.photoSizeSourceId) {
          case Util.PHOTOSIZE_SOURCE_LEGACY:
            inst.secret = decoded.secret;
            inst.photoSizeSource = 'legacy';
            break;
          case Util.PHOTOSIZE_SOURCE_THUMBNAIL:
            inst.thumbType = decoded.thumbnailType;
            inst.photoSizeSource = 'thumbnail';
            inst.thumbTypeId = decoded.thumbTypeId;
            break;
          case Util.PHOTOSIZE_SOURCE_DIALOGPHOTO_SMALL:
          case Util.PHOTOSIZE_SOURCE_DIALOGPHOTO_BIG:
            inst.photoSizeSource = 'dialogPhoto';
            inst.dialogId = decoded.dialogId;
            inst.dialogAccessHash = decoded.dialogAccessHash;
            inst.isSmallDialogPhoto = decoded.photoSizeSource === Util.PHOTOSIZE_SOURCE_DIALOGPHOTO_SMALL;
            break;
          case Util.PHOTOSIZE_SOURCE_STICKERSET_THUMBNAIL:
            inst.photoSizeSource = 'stickerSetThumbnail';
            inst.stickerSetId = decoded.stickerSetId;
            inst.stickerSetAccessHash = decoded.stickerSetAccessHash;
            break;
        }
      }
      return inst;
    } catch (e) {
      console.log(e);
      throw new Error("Invalid fileId");
    }
  }

  toFileId() {
    let type = this.typeId;

    if (this.fileReference) type |= Util.FLAGS.FILE_REFERENCE_FLAG;
    if (this.url) type |= Util.FLAGS.WEB_LOCATION_FLAG;

    let out = '';

    out += Util.to32bitBuffer(type);
    out += Util.to32bitBuffer(this.dcId);

    if (this.fileReference) {
      const tlString = Util.packTLString(Buffer.from(this.fileReference, 'hex'));
      out += tlString.toString('binary');
    }

    if (this.url) {
      const tlString = Util.packTLString(Buffer.from(this.url));
      out += tlString.toString('binary');
      if (this.accessHash) {
        out += Util.to64bitBuffer(this.accessHash);
      }
      return Util.base64UrlEncode(Util.rleEncode(out));
    }

    out += Util.to64bitBuffer(this.id);
    out += Util.to64bitBuffer(this.accessHash);

    if (this.typeId <= 2 && this.volumeId && this.photoSizeSourceId) {
      out += Util.to64bitBuffer(this.volumeId);
      if (this.version >= 4) {
        out += Util.to32bitBuffer(this.photoSizeSourceId);
      }

      switch (this.photoSizeSource) {
        case "legacy":
          out += Util.to64bitBuffer(this.secret);
          break;
        case "thumbnail":
          out += Util.to32bitBuffer(this.thumbTypeId);
          out += this.thumbType?.padEnd(4, "\0");
          break;
        case "dialogPhoto":
          out += Util.to64bitBuffer(this.dialogId);
          out += Util.to64bitBuffer(this.dialogAccessHash);
          break;
        case "stickerSetThumbnail":
          out += Util.to64bitBuffer(this.stickerSetId);
          out += Util.to64bitBuffer(this.stickerSetAccessHash);
          break;
      }

      out += Util.to32bitSignedBuffer(this.localId);
    }

    if (this.version >= 4) {
      out += String.fromCharCode(this.subVersion);
    }

    out += String.fromCharCode(this.version);
    return Util.base64UrlEncode(Util.rleEncode(out));
  }

  toFileUniqId() {
    return FileUniqId.fromFileIdInstance(this).toFileUniqId();
  }

  getOwnerId() {
    if (this.typeId === Util.TYPES.indexOf('sticker') && (this.version === 4 || this.version === 2)) {
      const tmp = Buffer.alloc(8);
      tmp.writeBigInt64LE(this.id & BigInt('72057589742960640'));
      return tmp.readUInt32LE(4);
    }
    return 0;
  }
}

export default FileId;
