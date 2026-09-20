/* EDDS (Enfusion DDS) → RGBA for the Compare mod card.
   Layout matches the public EDDS reader: DDS header, COPY/LZ4 block table,
   largest mip last. LZ4 is Enfusion's chunk stream (24-bit size + flags). */

const DDS = 0x20534444;
const DXT1 = 0x31545844;
const DXT3 = 0x33545844;
const DXT5 = 0x35545844;
const DDSPF_ALPHAPIXELS = 0x1;
const DDSPF_ALPHA = 0x2;
const DDSPF_FOURCC = 0x4;
const DDSPF_RGB = 0x40;
const DDSPF_LUMINANCE = 0x20000;
const CHUNK = 64 * 1024;

function u32(v, o) {
  return v[o] | (v[o + 1] << 8) | (v[o + 2] << 16) | (v[o + 3] << 24);
}

function i32(v, o) {
  const n = u32(v, o);
  return n > 0x7fffffff ? n - 0x100000000 : n;
}

function fourCC(v, o) {
  return String.fromCharCode(v[o], v[o + 1], v[o + 2], v[o + 3]);
}

/** LZ4 block into dst; matches may reach back into `dict` (prior 64 KiB). */
function lz4Block(src, dst, dict = new Uint8Array(0)) {
  const out = new Uint8Array(dict.length + dst.length);
  out.set(dict);
  let ip = 0;
  let op = dict.length;
  const end = out.length;
  const n = src.length;
  while (ip < n) {
    const token = src[ip++];
    let lit = token >> 4;
    if (lit === 15) {
      let b;
      do {
        if (ip >= n) throw new Error('edds: truncated LZ4 literals');
        b = src[ip++];
        lit += b;
      } while (b === 255);
    }
    if (op + lit > end || ip + lit > n) throw new Error('edds: LZ4 literal overrun');
    out.set(src.subarray(ip, ip + lit), op);
    ip += lit;
    op += lit;
    if (ip >= n) break;
    if (ip + 2 > n) throw new Error('edds: truncated LZ4 offset');
    const offset = src[ip] | (src[ip + 1] << 8);
    ip += 2;
    if (!offset || offset > op) throw new Error('edds: bad LZ4 offset');
    let match = (token & 15) + 4;
    if ((token & 15) === 15) {
      let b;
      do {
        if (ip >= n) throw new Error('edds: truncated LZ4 match');
        b = src[ip++];
        match += b;
      } while (b === 255);
    }
    if (op + match > end) throw new Error('edds: LZ4 match overrun');
    for (let i = 0; i < match; i++, op++) out[op] = out[op - offset];
  }
  if (op - dict.length !== dst.length) throw new Error('edds: LZ4 size mismatch');
  dst.set(out.subarray(dict.length));
}

function decompressLz4Stream(data, targetSize) {
  let stream = data;
  if (stream.length >= 8) {
    const peek = i32(stream, 0);
    const c0 = stream[4] | (stream[5] << 8) | (stream[6] << 16);
    if ((peek === targetSize) && c0 > 0 && c0 < (1 << 20)) stream = stream.subarray(4);
  }
  const out = new Uint8Array(targetSize);
  let outIdx = 0;
  let offset = 0;
  let dict = new Uint8Array(0);
  while (offset + 4 <= stream.length) {
    const cSize = stream[offset] | (stream[offset + 1] << 8) | (stream[offset + 2] << 16);
    const flags = stream[offset + 3];
    offset += 4;
    if (flags & ~0x80) throw new Error('edds: unknown LZ4 flags');
    if (cSize <= 0 || offset + cSize > stream.length) throw new Error('edds: bad LZ4 chunk');
    const chunk = stream.subarray(offset, offset + cSize);
    offset += cSize;
    const want = Math.min(CHUNK, targetSize - outIdx);
    if (want <= 0) throw new Error('edds: LZ4 overrun');
    const dst = out.subarray(outIdx, outIdx + want);
    lz4Block(chunk, dst, dict);
    outIdx += want;
    dict = new Uint8Array(out.subarray(Math.max(0, outIdx - CHUNK), outIdx));
    if (flags & 0x80) break;
  }
  if (outIdx !== targetSize) throw new Error('edds: decoded size mismatch');
  return out;
}

function mipDim(size, level) {
  return Math.max(1, size >> level);
}

function expectedSize(format, w, h) {
  if (format === 'dxt1') return Math.max(1, (w + 3) >> 2) * Math.max(1, (h + 3) >> 2) * 8;
  if (format === 'dxt3' || format === 'dxt5') return Math.max(1, (w + 3) >> 2) * Math.max(1, (h + 3) >> 2) * 16;
  if (format === 'bgra8' || format === 'rgba8') return w * h * 4;
  if (format === 'r8' || format === 'a8') return w * h;
  return -1;
}

function detectFormat(bytes) {
  const flags = u32(bytes, 80);
  const four = u32(bytes, 84);
  const bits = u32(bytes, 88);
  const r = u32(bytes, 92);
  const g = u32(bytes, 96);
  const b = u32(bytes, 100);
  const a = u32(bytes, 104);
  if (flags & DDSPF_FOURCC) {
    if (four === DXT1) return 'dxt1';
    if (four === DXT3) return 'dxt3';
    if (four === DXT5) return 'dxt5';
    return '';
  }
  if ((flags & DDSPF_RGB) && bits === 32 && (flags & DDSPF_ALPHAPIXELS)) {
    if (r === 0x000000ff && g === 0x0000ff00 && b === 0x00ff0000 && a === 0xff000000) return 'rgba8';
    if (r === 0x00ff0000 && g === 0x0000ff00 && b === 0x000000ff && a === 0xff000000) return 'bgra8';
  }
  if ((flags & DDSPF_RGB) && bits === 8 && r === 0xff && !g && !b && !a) return 'r8';
  if ((flags & DDSPF_LUMINANCE) && bits === 8 && r === 0xff) return 'r8';
  if ((flags & DDSPF_ALPHA) && bits === 8 && a === 0xff) return 'a8';
  return '';
}

function rgb565(c) {
  return [((c >> 11) & 31) * 255 / 31 | 0, ((c >> 5) & 63) * 255 / 63 | 0, (c & 31) * 255 / 31 | 0];
}

function decodeDxt1Block(block, out, ox, oy, w, h, punch) {
  const c0 = block[0] | (block[1] << 8);
  const c1 = block[2] | (block[3] << 8);
  const [r0, g0, b0] = rgb565(c0);
  const [r1, g1, b1] = rgb565(c1);
  const colors = [[r0, g0, b0, 255], [r1, g1, b1, 255]];
  if (c0 > c1) {
    colors.push([(2 * r0 + r1) / 3 | 0, (2 * g0 + g1) / 3 | 0, (2 * b0 + b1) / 3 | 0, 255]);
    colors.push([(r0 + 2 * r1) / 3 | 0, (g0 + 2 * g1) / 3 | 0, (b0 + 2 * b1) / 3 | 0, 255]);
  } else {
    colors.push([(r0 + r1) / 2 | 0, (g0 + g1) / 2 | 0, (b0 + b1) / 2 | 0, 255]);
    colors.push([0, 0, 0, punch ? 0 : 255]);
  }
  let bits = u32(block, 4);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = ox + col;
      const y = oy + row;
      if (x >= w || y >= h) {
        bits >>= 2;
        continue;
      }
      const c = colors[bits & 3];
      const i = (y * w + x) * 4;
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = c[3];
      bits >>= 2;
    }
  }
}

function decodeDxt5Alpha(block, alphas) {
  const a0 = block[0];
  const a1 = block[1];
  alphas[0] = a0;
  alphas[1] = a1;
  if (a0 > a1) {
    for (let i = 1; i <= 6; i++) alphas[i + 1] = ((7 - i) * a0 + i * a1) / 7 | 0;
  } else {
    for (let i = 1; i <= 4; i++) alphas[i + 1] = ((5 - i) * a0 + i * a1) / 5 | 0;
    alphas[6] = 0;
    alphas[7] = 255;
  }
}

function decodeDxt5Block(block, out, ox, oy, w, h) {
  const alphas = new Uint8Array(8);
  decodeDxt5Alpha(block, alphas);
  let abits = 0n;
  for (let i = 0; i < 6; i++) abits |= BigInt(block[2 + i]) << (8n * BigInt(i));
  decodeDxt1Block(block.subarray(8), out, ox, oy, w, h, false);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = ox + col;
      const y = oy + row;
      if (x < w && y < h) out[(y * w + x) * 4 + 3] = alphas[Number(abits & 7n)];
      abits >>= 3n;
    }
  }
}

function decodePayload(format, data, w, h) {
  const rgba = new Uint8Array(w * h * 4);
  if (format === 'bgra8') {
    for (let i = 0, j = 0; i < data.length; i += 4, j += 4) {
      rgba[j] = data[i + 2];
      rgba[j + 1] = data[i + 1];
      rgba[j + 2] = data[i];
      rgba[j + 3] = data[i + 3];
    }
    return rgba;
  }
  if (format === 'rgba8') {
    rgba.set(data.subarray(0, rgba.length));
    return rgba;
  }
  if (format === 'r8') {
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      const j = i * 4;
      rgba[j] = v;
      rgba[j + 1] = v;
      rgba[j + 2] = v;
      rgba[j + 3] = 255;
    }
    return rgba;
  }
  if (format === 'a8') {
    for (let i = 0; i < data.length; i++) {
      const j = i * 4;
      rgba[j] = 255;
      rgba[j + 1] = 255;
      rgba[j + 2] = 255;
      rgba[j + 3] = data[i];
    }
    return rgba;
  }
  if (format === 'dxt1' || format === 'dxt5') {
    const bw = Math.max(1, (w + 3) >> 2);
    const bh = Math.max(1, (h + 3) >> 2);
    const blockSize = format === 'dxt1' ? 8 : 16;
    let o = 0;
    for (let by = 0; by < bh; by++) {
      for (let bx = 0; bx < bw; bx++, o += blockSize) {
        const block = data.subarray(o, o + blockSize);
        if (format === 'dxt1') decodeDxt1Block(block, rgba, bx * 4, by * 4, w, h, true);
        else decodeDxt5Block(block, rgba, bx * 4, by * 4, w, h);
      }
    }
    return rgba;
  }
  throw new Error(`edds: unsupported format ${format}`);
}

/**
 * Decode an EDDS buffer to { width, height, rgba }.
 * Returns null when the bytes are not a usable 2D EDDS texture.
 */
export function decodeEdds(buffer) {
  try {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.length < 128 || u32(bytes, 0) !== DDS) return null;
    const height = u32(bytes, 12);
    const width = u32(bytes, 16);
    const mipMaps = Math.max(1, u32(bytes, 28) || 1);
    if (!width || !height || width > 8192 || height > 8192 || mipMaps > 32) return null;
    const format = detectFormat(bytes);
    if (!format) return null;

    let offset = 128;
    const table = [];
    if (offset + mipMaps * 8 > bytes.length) return null;
    for (let i = 0; i < mipMaps; i++) {
      const magic = fourCC(bytes, offset);
      const size = i32(bytes, offset + 4);
      if ((magic !== 'COPY' && magic !== 'LZ4 ') || size < 0) return null;
      table.push({ magic, size });
      offset += 8;
    }

    let mipData = null;
    let mipW = width;
    let mipH = height;
    for (let i = 0; i < mipMaps; i++) {
      const mipLevel = mipMaps - i - 1;
      const { magic, size } = table[i];
      if (offset + size > bytes.length) return null;
      if (mipLevel !== 0) {
        offset += size;
        continue;
      }
      mipW = mipDim(width, mipLevel);
      mipH = mipDim(height, mipLevel);
      const expected = expectedSize(format, mipW, mipH);
      const body = bytes.subarray(offset, offset + size);
      offset += size;
      if (magic === 'COPY') {
        if (body.length !== expected) return null;
        mipData = body;
      } else {
        mipData = decompressLz4Stream(body, expected);
      }
      break;
    }
    if (!mipData) return null;
    return { width: mipW, height: mipH, rgba: decodePayload(format, mipData, mipW, mipH) };
  } catch {
    return null;
  }
}

/** RGBA image as a PNG data URL for <img>. */
export function eddsToDataUrl(decoded) {
  if (!decoded || typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = decoded.width;
  canvas.height = decoded.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const image = ctx.createImageData(decoded.width, decoded.height);
  image.data.set(decoded.rgba);
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}
