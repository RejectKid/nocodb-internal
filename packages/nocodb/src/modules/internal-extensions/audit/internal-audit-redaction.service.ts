import { Injectable } from '@nestjs/common';
import type { InternalAuditSummary } from './internal-audit-event.model';

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 8;
const MAX_KEYS = 200;
const MAX_ARRAY_ITEMS = 200;
const MAX_STRING_LENGTH = 2_000;
const MAX_SUMMARY_BYTES = 64 * 1024;
const SAFE_TOKEN_KEYS = new Set(['token_id', 'token_prefix']);
const SENSITIVE_KEY =
  /(authorization|cookie|password|secret|credential|api[_-]?key|private[_-]?key|hash|salt|token)/i;
const SECRET_VALUE =
  /^(?:Bearer\s+\S+|nci_[A-Za-z0-9_-]{12}_[A-Za-z0-9_-]{43}|scrypt\$)/i;

@Injectable()
export class InternalAuditRedactionService {
  sanitize(summary: InternalAuditSummary | null | undefined) {
    if (!summary) {
      return null;
    }
    const sanitized = this.sanitizeValue(
      summary,
      0,
      new WeakSet(),
    ) as InternalAuditSummary;
    const bytes = Buffer.byteLength(JSON.stringify(sanitized));
    return bytes > MAX_SUMMARY_BYTES
      ? { _truncated: true, _originalBytes: bytes }
      : sanitized;
  }

  private sanitizeValue(
    value: unknown,
    depth: number,
    seen: WeakSet<object>,
    key?: string,
  ): unknown {
    if (
      key &&
      SENSITIVE_KEY.test(key) &&
      !SAFE_TOKEN_KEYS.has(key.toLowerCase())
    ) {
      return REDACTED;
    }
    if (depth > MAX_DEPTH) {
      return '[TRUNCATED]';
    }
    if (typeof value === 'string') {
      if (SECRET_VALUE.test(value)) {
        return REDACTED;
      }
      return value.length > MAX_STRING_LENGTH
        ? `${value.slice(0, MAX_STRING_LENGTH)}…`
        : value;
    }
    if (
      value === null ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }
    if (typeof value !== 'object') {
      return String(value);
    }
    if (seen.has(value)) {
      return '[CIRCULAR]';
    }
    seen.add(value);

    if (Array.isArray(value)) {
      return value
        .slice(0, MAX_ARRAY_ITEMS)
        .map((item) => this.sanitizeValue(item, depth + 1, seen));
    }

    return Object.fromEntries(
      Object.entries(value)
        .slice(0, MAX_KEYS)
        .map(([entryKey, entryValue]) => [
          entryKey,
          this.sanitizeValue(entryValue, depth + 1, seen, entryKey),
        ]),
    );
  }
}
