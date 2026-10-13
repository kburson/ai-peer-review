// @story #202
import { createHash } from 'node:crypto';
import {
  constants,
  lstatSync,
  readdirSync,
  readlinkSync,
  openSync,
  readSync,
  fstatSync,
  closeSync,
} from 'node:fs';
import path from 'node:path';
import { AprError } from '../errors.mjs';

export function historyUnavailable(message, details = {}) {
  throw new AprError('APR_PRIMARY_AUTHORITY_UNAVAILABLE', message, {
    details,
    recovery:
      'Inspect the preserved history or maintenance hold; preserve original evidence and never infer a terminal review decision.',
  });
}
const identity = (s) => [s.dev, s.ino, s.mode, s.size, s.mtimeNs, s.ctimeNs].join(':');
export function snapshotReviewHistory(target) {
  const hash = createHash('sha256');
  let files = 0,
    bytes = 0;
  const block = Buffer.alloc(64 * 1024);
  function walk(file, relative, depth) {
    if (++files > 32768 || depth > 128)
      historyUnavailable('Historical snapshot exceeds its entry bound.');
    const before = lstatSync(file, { bigint: true });
    hash.update(JSON.stringify([relative, String(before.mode & 0o777n)]));
    if (before.isSymbolicLink()) {
      const link = readlinkSync(file);
      bytes += Buffer.byteLength(link);
      if (Buffer.byteLength(link) > 65536) historyUnavailable('Historical link exceeds its bound.');
      hash.update('link').update(JSON.stringify(link));
    } else if (before.isDirectory()) {
      hash.update('directory');
      for (const name of readdirSync(file).sort())
        walk(path.join(file, name), relative ? relative + '/' + name : name, depth + 1);
    } else if (before.isFile()) {
      const size = Number(before.size);
      if (size > 256 * 1024 * 1024 || (bytes += size) > 512 * 1024 * 1024)
        historyUnavailable('Historical snapshot exceeds its byte bound.');
      hash.update('file').update(String(size));
      const fd = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      try {
        if (identity(fstatSync(fd, { bigint: true })) !== identity(before))
          historyUnavailable('Historical file changed before observation.');
        let offset = 0;
        while (offset < size) {
          const count = readSync(fd, block, 0, Math.min(block.length, size - offset), offset);
          if (!count) historyUnavailable('Historical file changed during observation.');
          hash.update(block.subarray(0, count));
          offset += count;
        }
        if (identity(fstatSync(fd, { bigint: true })) !== identity(before))
          historyUnavailable('Historical file changed during observation.');
      } finally {
        closeSync(fd);
      }
    } else historyUnavailable('Historical snapshot contains a special file.', { file });
    if (
      bytes > 512 * 1024 * 1024 ||
      identity(lstatSync(file, { bigint: true })) !== identity(before)
    )
      historyUnavailable('Historical snapshot changed during observation.', { file });
  }
  walk(target, '', 0);
  return Object.freeze({ digest: hash.digest('hex'), files, bytes });
}
