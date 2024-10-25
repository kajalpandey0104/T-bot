import { FileIdInfo, UniqFileIdInfo } from "./types/FileIdInfo";

class Util {
  static FLAGS = {
    FILE_REFERENCE_FLAG: 1 << 25,
    WEB_LOCATION_FLAG: 1 << 24,
  };
  static PHOTOSIZE_SOURCE_LEGACY = 0;
  static PHOTOSIZE_SOURCE_THUMBNAIL = 1;
  static PHOTOSIZE_SOURCE_DIALOGPHOTO_SMALL = 2;
  static PHOTOSIZE_SOURCE_DIALOGPHOTO_BIG = 3;
  static PHOTOSIZE_SOURCE_STICKERSET_THUMBNAIL = 4;
  static UNIQUE_WEB = 0;
  static UNIQUE_PHOTO = 1;
  static UNIQUE_DOCUMENT = 2;
  static UNIQUE_SECURE = 3;
  static UNIQUE_ENCRYPTED = 4;
  static UNIQUE_TEMP = 5;
  static TYPES = [
    'thumbnail',
    'profile_photo',
    'photo',
    'voice',
    'video',
    'document',
    'encrypted',
    'temp',
    'sticker',
    'audio',
    'animation',
    'encrypted_thumbnail',
    'wallpaper',
    'video_note',
    'secure_raw',
    'secure',
    'background',
    'size',
  ];
  static UNIQUE_TYPES = [
    'web',
    'photo',
    'document',
    'secure',
    'encrypted',
    'temp',
  ];

  static rleDecode(input) {
    let last = '',
      news = '',
      splited = input.toString('binary');
    for (let cur of splited) {
      if (last === "\0") {
        news += last.repeat(cur.charCodeAt(0));
        last = '';
      } else {
        news += last;
        last = cur;
      }
    }
    return Buffer.from(news + last, 'binary');
  }

  static rleEncode(input) {
    let newStr = '';
    let count = 0;
    const nullStr = "\0";
    for (let cur of input.split('')) {
      if (cur === nullStr) {
        ++count;
      } else {
        if (count > 0) {
          newStr += nullStr + String.fromCharCode(count);
          count = 0;
        }
        newStr += cur;
      }
    }
    if (count > 0) {
      newStr += nullStr + String.fromCharCode(count);
    }
    return newStr;
  }

  static posmod(a, b) {
    let resto = a % b;
    return resto < 0 ? resto + Math.abs(b) : resto;
  }

  static readTLString(data) {
    let l = data[0];
    let x;
    if (l > 254) throw new Error("Length too big");
    
    if (l === 254) {
      let tmpBuff = Buffer.alloc(4);
      data.copy(tmpBuff, 0, 0, 3);
      tmpBuff.write("\0", 3);
      let long_len = tmpBuff.readInt32LE();
      x = data.slice(4, 4 + long_len);
      let resto = Util.posmod(-long_len, 4);
      data = resto > 0 ? data.slice(4 + long_len + resto) : data.slice(4 + long_len);
    } else {
      x = l ? data.slice(1, 1 + l) : Buffer.from('');
      let resto = Util.posmod(-(l + 1), 4);
      data = resto > 0 ? data.slice(1 + l + resto) : data.slice(1 + l);
    }
    return { x, newData: data };
  }

  static packTLString(input) {
    let l = input.length;
    let output = '';
    if (l <= 253) {
      output += String.fromCharCode(l) + input.toString('binary') + "\0".repeat(Util.posmod(-l - 1, 4));
    } else {
      output += String.fromCharCode(254);
      let buff = Buffer.alloc(4);
      buff.writeInt32LE(l);
      output += buff.slice(0, 3).toString() + input + "\0".repeat(Util.posmod(-l, 4));
    }
    return Buffer.from(output, 'binary');
  }

  static base64UrlDecode(string) {
    return Buffer.from(string.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  }

  static base64UrlEncode(input) {
    if (typeof input === 'string') input = Buffer.from(input, 'binary');
    return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  static to64bitBuffer(input) {
    let tmp = Buffer.alloc(8);
    tmp.writeBigInt64LE(input);
    return tmp.toString('binary');
  }

  static to32bitBuffer(input) {
    let tmp = Buffer.alloc(4);
    tmp.writeUInt32LE(input);
    return tmp.toString('binary');
  }

  static to32bitSignedBuffer(input) {
    let tmp = Buffer.alloc(4);
    tmp.writeInt32LE(input);
    return tmp.toString('binary');
  }

  static decodeFileId(fileId) {
    let base64Decoded = Util.base64UrlDecode(fileId);
    let rlDecoded = Util.rleDecode(base64Decoded);
    let out = {};
    out.version = rlDecoded[rlDecoded.length - 1];
    out.subVersion = out.version === 4 ? rlDecoded[rlDecoded.length - 2] : 0;
    out.typeId = rlDecoded.readUInt32LE(0);
    out.dcId = rlDecoded.readUInt32LE(4);
    out.hasReference = !!(out.typeId & Util.FLAGS.FILE_REFERENCE_FLAG);
    out.hasWebLocation = !!(out.typeId & Util.FLAGS.WEB_LOCATION_FLAG);
    out.typeId &= ~Util.FLAGS.FILE_REFERENCE_FLAG;
    out.typeId &= ~Util.FLAGS.WEB_LOCATION_FLAG;

    out.fileType = Util.TYPES[out.typeId];
    rlDecoded = rlDecoded.slice(8);
    if (out.hasReference) {
      let { x, newData } = Util.readTLString(rlDecoded);
      rlDecoded = newData;
      out.fileReference = x.toString('hex');
    }
    if (out.hasWebLocation) {
      let { x } = Util.readTLString(rlDecoded);
      out.url = x.toString();
      out.access_hash = rlDecoded.readBigInt64LE(8);
      return out;
    }
    out.id = rlDecoded.readBigInt64LE();
    out.access_hash = rlDecoded.readBigInt64LE(8);
    rlDecoded = rlDecoded.slice(128 / 8);

    if (out.typeId <= 2) {
      out.volumeId = rlDecoded.readBigInt64LE();
      out.secret = 0;
      out.photoSizeSource = out.version >= 4 ? rlDecoded.readUInt32LE(8) : 0;

      switch (out.photoSizeSource) {
        case Util.PHOTOSIZE_SOURCE_LEGACY:
          out.secret = rlDecoded.readBigInt64LE(12);
          out.localId = rlDecoded.readInt32LE(20);
          break;
        case Util.PHOTOSIZE_SOURCE_THUMBNAIL:
          let typeId = rlDecoded.readUInt32LE(12);
          out.fileType = Util.TYPES[typeId];
          out.thumbTypeId = typeId;
          out.thumbnailType = rlDecoded.slice(16, 20).toString().replace(/\u0000/g, '');
          out.localId = rlDecoded.readInt32LE(20);
          break;
        case Util.PHOTOSIZE_SOURCE_DIALOGPHOTO_BIG:
        case Util.PHOTOSIZE_SOURCE_DIALOGPHOTO_SMALL:
          out.photoSize = out.photoSizeSource === Util.PHOTOSIZE_SOURCE_DIALOGPHOTO_SMALL ? "small" : 'big';
          out.dialogId = rlDecoded.readBigInt64LE(12);
          out.dialogAccessHash = rlDecoded.readBigInt64LE(20);
          out.localId = rlDecoded.readInt32LE(28);
          break;
        case Util.PHOTOSIZE_SOURCE_STICKERSET_THUMBNAIL:
          out.stickerSetId = rlDecoded.readBigInt64LE(12);
          out.stickerSetAccessHash = rlDecoded.readBigInt64LE(20);
          out.localId = rlDecoded.readInt32LE(28);
          break;
      }
    }
    return out;
  }

  static decodeUniqueFileId(input) {
    let rlDecoded = Util.rleDecode(Util.base64UrlDecode(input));
    let out = {};
    out.typeId = rlDecoded.readUInt32LE();
    if (!Util.UNIQUE_TYPES[out.typeId]) throw new Error("Invalid file type provided: " + out.typeId);
    
    out.type = Util.UNIQUE_TYPES[out.typeId];
    rlDecoded = rlDecoded.slice(4);

    if (out.typeId === Util.UNIQUE_WEB) {
      let { x } = Util.readTLString(rlDecoded.slice());
      out.url = x.toString();
    } else if (rlDecoded.length === 12) {
      out.volumeId = rlDecoded.readBigInt64LE();
      out.localId = rlDecoded.readUInt32LE(8);
    } else {
      out.id = rlDecoded.readBigInt64LE();
    }
    return out;
  }
}

export default Util;
