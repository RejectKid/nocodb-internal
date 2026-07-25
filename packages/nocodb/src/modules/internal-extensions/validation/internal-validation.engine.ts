import { Injectable } from '@nestjs/common';
import type {
  InternalFieldValidationConfiguration,
  InternalValidationFailure,
  InternalValidationRule,
} from './internal-validation.types';

const empty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

const attachmentList = (value: unknown): Record<string, unknown>[] => {
  if (typeof value === 'string') {
    try {
      return attachmentList(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object',
  );
};

const safeRegex = (source: string, flags = '') => {
  // Reject constructs commonly used for catastrophic backtracking. Internal
  // rules are data, never executable code.
  if (
    source.length > 256 ||
    /\\[1-9]/.test(source) ||
    /\((?:[^()]|\([^()]*\))*[+*}]\)[+*{]/.test(source)
  ) {
    throw new Error('Unsafe regular expression');
  }
  return new RegExp(source, flags);
};

const defaultMessage = (
  field: string,
  rule: InternalValidationRule,
): string => {
  const descriptions: Record<InternalValidationRule['type'], string> = {
    required: 'is required',
    minLength: 'is shorter than the minimum length',
    maxLength: 'is longer than the maximum length',
    regex: 'does not match the required pattern',
    min: 'is below the minimum value',
    max: 'is above the maximum value',
    integer: 'must be an integer',
    decimalPrecision: 'has too many decimal places',
    earliestDate: 'is earlier than allowed',
    latestDate: 'is later than allowed',
    allowedValues: 'is not an allowed value',
    fileType: 'contains a disallowed file type',
    fileSize: 'contains a file that is too large',
    maxAttachmentCount: 'contains too many attachments',
  };
  return `${field} ${descriptions[rule.type]}`;
};

@Injectable()
export class InternalValidationEngine {
  validate(
    records: Record<string, unknown>[],
    configurations: InternalFieldValidationConfiguration[],
    mode: 'create' | 'update',
  ): InternalValidationFailure[] {
    const failures: InternalValidationFailure[] = [];
    for (const record of records) {
      for (const configuration of configurations) {
        const present = Object.prototype.hasOwnProperty.call(
          record,
          configuration.fieldKey,
        );
        const value = record[configuration.fieldKey];
        for (const rule of configuration.rules) {
          if (mode === 'update' && !present) continue;
          if (rule.type !== 'required' && empty(value)) {
            continue;
          }
          if (!this.passes(rule, value, present, mode)) {
            failures.push({
              field: configuration.fieldKey,
              rule: rule.type,
              message:
                rule.message ?? defaultMessage(configuration.fieldKey, rule),
            });
          }
        }
      }
    }
    return failures;
  }

  assertRegexIsSafe(rule: InternalValidationRule) {
    if (rule.type === 'regex') safeRegex(rule.value, rule.flags);
  }

  private passes(
    rule: InternalValidationRule,
    value: unknown,
    present: boolean,
    mode: 'create' | 'update',
  ): boolean {
    switch (rule.type) {
      case 'required':
        return (mode === 'update' && !present) || !empty(value);
      case 'minLength':
        return String(value).length >= rule.value;
      case 'maxLength':
        return String(value).length <= rule.value;
      case 'regex':
        return safeRegex(rule.value, rule.flags).test(String(value));
      case 'min':
        return Number.isFinite(Number(value)) && Number(value) >= rule.value;
      case 'max':
        return Number.isFinite(Number(value)) && Number(value) <= rule.value;
      case 'integer':
        return Number.isInteger(Number(value));
      case 'decimalPrecision': {
        const text = String(value);
        return (text.split('.')[1]?.length ?? 0) <= rule.value;
      }
      case 'earliestDate': {
        const timestamp = new Date(String(value)).getTime();
        return !Number.isNaN(timestamp) && timestamp >= Date.parse(rule.value);
      }
      case 'latestDate': {
        const timestamp = new Date(String(value)).getTime();
        return !Number.isNaN(timestamp) && timestamp <= Date.parse(rule.value);
      }
      case 'allowedValues':
        return rule.value.some((allowed) => allowed === value);
      case 'fileType': {
        const allowed = rule.value.map((type) => type.toLowerCase());
        return attachmentList(value).every((attachment) => {
          const mime = String(
            attachment.mimetype ?? attachment.type ?? '',
          ).toLowerCase();
          const title = String(
            attachment.title ?? attachment.name ?? '',
          ).toLowerCase();
          return allowed.some(
            (type) =>
              mime === type ||
              (type.endsWith('/*') && mime.startsWith(type.slice(0, -1))) ||
              (type.startsWith('.') && title.endsWith(type)),
          );
        });
      }
      case 'fileSize':
        return attachmentList(value).every(
          (attachment) => Number(attachment.size ?? 0) <= rule.value,
        );
      case 'maxAttachmentCount':
        return attachmentList(value).length <= rule.value;
    }
  }
}
