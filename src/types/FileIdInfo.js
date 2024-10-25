// Define FileIdInfo type as a JavaScript object
const FileIdInfo = {
  version: 0,
  subVersion: 0,
  typeId: 0,
  dcId: 0,
  hasReference: false,
  hasWebLocation: false,
  fileType: '', // Can be string or number based on usage
  fileReference: '',
  url: '', // Optional
  access_hash: BigInt(0),
  id: BigInt(0),
  volumeId: BigInt(0), // Optional
  secret: BigInt(0), // Can be bigint or number
  photoSizeSource: 0, // Optional
  thumbnailType: '', // Optional
  photoSize: '', // "small" or "big"
  dialogId: BigInt(0), // Optional, can be number or bigint
  dialogAccessHash: BigInt(0), // Optional, can be number or bigint
  stickerSetId: BigInt(0), // Optional, can be number or bigint
  stickerSetAccessHash: BigInt(0), // Optional, can be number or bigint
  localId: 0, // Optional
  thumbTypeId: 0 // Optional
};

// Define UniqFileIdInfo type as a JavaScript object
const UniqFileIdInfo = {
  type: '',
  typeId: 0,
  url: '', // Optional
  volumeId: BigInt(0), // Optional
  localId: 0, // Optional
  id: BigInt(0) // Optional
};
