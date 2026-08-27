export const MAX_PUBLIC_SITE_IMAGE_BYTES = 5 * 1024 * 1024;

export type ValidatedSiteImage = {
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/x-icon';
  extension: 'png' | 'jpg' | 'webp' | 'ico';
  width: number;
  height: number;
};

export class SiteImageValidationError extends Error {}

const ascii = (bytes: Buffer, start: number, length: number) => bytes.subarray(start, start + length).toString('ascii');
const positiveDimensions = (width: number, height: number) => Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 && width <= 65535 && height <= 65535;
const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  return crc >>> 0;
});
const crc32 = (bytes: Buffer) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

function pngDimensions(bytes: Buffer): { width: number; height: number } | null {
  const signature = [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a];
  if (bytes.length < 45 || !signature.every((value, index) => bytes[index] === value)) return null;
  let offset = 8; let dimensions: { width: number; height: number } | null = null; let chunkIndex = 0;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset); const chunkEnd = offset + 12 + length;
    if (chunkEnd > bytes.length) return null;
    const type = ascii(bytes, offset + 4, 4);
    const expectedCrc = bytes.readUInt32BE(offset + 8 + length);
    if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== expectedCrc) return null;
    if (chunkIndex === 0) {
      if (type !== 'IHDR' || length !== 13) return null;
      const width = bytes.readUInt32BE(offset + 8); const height = bytes.readUInt32BE(offset + 12);
      if (!positiveDimensions(width, height)) return null;
      dimensions = { width, height };
    }
    offset = chunkEnd; chunkIndex += 1;
    if (type === 'IEND') return length === 0 && offset === bytes.length ? dimensions : null;
  }
  return null;
}

function jpegDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return null;
  const sofMarkers = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
  let offset = 2; let dimensions: { width: number; height: number } | null = null;
  while (offset + 4 <= bytes.length - 2) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;
    const marker = bytes[offset++];
    if (marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (sofMarkers.has(marker)) {
      if (segmentLength < 7) return null;
      const height = bytes.readUInt16BE(offset + 3); const width = bytes.readUInt16BE(offset + 5);
      if (!positiveDimensions(width, height)) return null;
      dimensions = { width, height };
    }
    if (marker === 0xda) return dimensions && offset + segmentLength < bytes.length - 2 ? dimensions : null;
    offset += segmentLength;
  }
  return null;
}

function webpDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP' || bytes.readUInt32LE(4) + 8 !== bytes.length) return null;
  const chunk = ascii(bytes, 12, 4); const chunkLength = bytes.readUInt32LE(16);
  if (20 + chunkLength + (chunkLength % 2) > bytes.length) return null;
  let width = 0; let height = 0;
  if (chunk === 'VP8X') {
    width = 1 + bytes.readUIntLE(24, 3); height = 1 + bytes.readUIntLE(27, 3);
  } else if (chunk === 'VP8L' && bytes[20] === 0x2f) {
    width = 1 + (((bytes[22] & 0x3f) << 8) | bytes[21]);
    height = 1 + (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | ((bytes[22] & 0xc0) >> 6));
  } else if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    width = bytes.readUInt16LE(26) & 0x3fff; height = bytes.readUInt16LE(28) & 0x3fff;
  }
  return positiveDimensions(width, height) ? { width, height } : null;
}

function icoDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 22 || bytes.readUInt16LE(0) !== 0 || bytes.readUInt16LE(2) !== 1) return null;
  const count = bytes.readUInt16LE(4); const directoryEnd = 6 + count * 16;
  if (!count || directoryEnd > bytes.length) return null;
  const imageSize = bytes.readUInt32LE(14); const imageOffset = bytes.readUInt32LE(18);
  if (!imageSize || imageOffset < directoryEnd || imageOffset + imageSize > bytes.length) return null;
  const width = bytes[6] || 256; const height = bytes[7] || 256;
  if (!positiveDimensions(width, height)) return null;
  const image = bytes.subarray(imageOffset, imageOffset + imageSize);
  const embeddedPng = pngDimensions(image);
  const dibSize = image.length >= 4 ? image.readUInt32LE(0) : 0;
  if (!embeddedPng && ![40,108,124].includes(dibSize)) return null;
  return { width, height };
}

export function validatePublicSiteImage(bytes: Buffer, originalFileName: string): ValidatedSiteImage {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new SiteImageValidationError('Image body is empty.');
  if (bytes.length > MAX_PUBLIC_SITE_IMAGE_BYTES) throw new SiteImageValidationError('Image exceeds the 5 MB limit.');
  const requestedExtension = originalFileName.toLowerCase().split('.').pop();
  if (!requestedExtension || !['png','jpg','jpeg','webp','ico'].includes(requestedExtension)) throw new SiteImageValidationError('Unsupported image extension.');

  const candidates: Array<{ extension: ValidatedSiteImage['extension']; mimeType: ValidatedSiteImage['mimeType']; dimensions: { width: number; height: number } | null }> = [
    { extension: 'png', mimeType: 'image/png', dimensions: pngDimensions(bytes) },
    { extension: 'jpg', mimeType: 'image/jpeg', dimensions: jpegDimensions(bytes) },
    { extension: 'webp', mimeType: 'image/webp', dimensions: webpDimensions(bytes) },
    { extension: 'ico', mimeType: 'image/x-icon', dimensions: icoDimensions(bytes) },
  ];
  const detected = candidates.find((candidate) => candidate.dimensions);
  if (!detected?.dimensions) throw new SiteImageValidationError('The uploaded bytes are not a valid supported image container.');
  const normalizedRequested = requestedExtension === 'jpeg' ? 'jpg' : requestedExtension;
  if (normalizedRequested !== detected.extension) throw new SiteImageValidationError('File extension does not match the detected binary image type.');
  return { extension: detected.extension, mimeType: detected.mimeType, ...detected.dimensions };
}
