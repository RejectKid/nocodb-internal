import { Injectable } from '@nestjs/common';
import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';
import type { ScryptOptions } from 'node:crypto';
import {
  type GeneratedInternalToken,
  InternalTokenHashingService,
} from './internal-token-hashing.service';

const HASH_NAME = 'scrypt';
const HASH_VERSION = 'v1';
const KEY_LENGTH = 32;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const TOKEN_VALUE_PATTERN = /^nci_[A-Za-z0-9_-]{12}_[A-Za-z0-9_-]{43}$/;
const SALT_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const HASH_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function deriveKey(
  tokenValue: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(tokenValue, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

@Injectable()
export class ScryptInternalTokenHashingService extends InternalTokenHashingService {
  generate(): GeneratedInternalToken {
    const publicIdentifier = randomBytes(9).toString('base64url');
    const secret = randomBytes(32).toString('base64url');
    const prefix = `nci_${publicIdentifier}`;

    return {
      prefix,
      value: `${prefix}_${secret}`,
    };
  }

  async hash(tokenValue: string): Promise<string> {
    const salt = randomBytes(16);
    const derivedKey = await deriveKey(tokenValue, salt, KEY_LENGTH, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELIZATION,
      maxmem: 64 * 1024 * 1024,
    });

    return [
      HASH_NAME,
      HASH_VERSION,
      SCRYPT_COST,
      SCRYPT_BLOCK_SIZE,
      SCRYPT_PARALLELIZATION,
      salt.toString('base64url'),
      derivedKey.toString('base64url'),
    ].join('$');
  }

  async verify(tokenValue: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split('$');
    if (parts.length !== 7 || !TOKEN_VALUE_PATTERN.test(tokenValue)) {
      return false;
    }
    const [name, version, cost, blockSize, parallelization, salt, hash] = parts;

    if (
      name !== HASH_NAME ||
      version !== HASH_VERSION ||
      !cost ||
      !blockSize ||
      !parallelization ||
      !salt ||
      !hash ||
      Number(cost) !== SCRYPT_COST ||
      Number(blockSize) !== SCRYPT_BLOCK_SIZE ||
      Number(parallelization) !== SCRYPT_PARALLELIZATION ||
      !SALT_PATTERN.test(salt) ||
      !HASH_PATTERN.test(hash)
    ) {
      return false;
    }

    const expected = Buffer.from(hash, 'base64url');
    const saltBuffer = Buffer.from(salt, 'base64url');
    if (expected.length !== KEY_LENGTH || saltBuffer.length !== 16) {
      return false;
    }
    const actual = await deriveKey(tokenValue, saltBuffer, expected.length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelization),
      maxmem: 64 * 1024 * 1024,
    });

    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }
}
