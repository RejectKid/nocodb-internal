import { InternalAuditRedactionService } from './internal-audit-redaction.service';

describe('InternalAuditRedactionService', () => {
  const service = new InternalAuditRedactionService();

  it('recursively redacts secrets while retaining safe token identifiers', () => {
    expect(
      service.sanitize({
        token_id: 'token-1',
        token_prefix: 'nci_abcdefghijkl',
        token: 'nci_abcdefghijkl_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNO1',
        nested: {
          password: 'password',
          authorization: 'Bearer secret',
          token_hash: 'scrypt$v1$secret',
          scopes: ['data:read'],
        },
      }),
    ).toEqual({
      token_id: 'token-1',
      token_prefix: 'nci_abcdefghijkl',
      token: '[REDACTED]',
      nested: {
        password: '[REDACTED]',
        authorization: '[REDACTED]',
        token_hash: '[REDACTED]',
        scopes: ['data:read'],
      },
    });
  });

  it('redacts token material even under a harmless key', () => {
    const tokenValue = `nci_abcdefghijkl_${'a'.repeat(43)}`;
    expect(
      service.sanitize({
        value: tokenValue,
      }),
    ).toEqual({ value: '[REDACTED]' });
  });

  it('handles circular objects without throwing', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(service.sanitize(circular)).toEqual({ self: '[CIRCULAR]' });
  });

  it('bounds the serialized summary size', () => {
    const oversized = Object.fromEntries(
      Array.from({ length: 100 }, (_, index) => [
        `field_${index}`,
        'x'.repeat(2_000),
      ]),
    );
    expect(service.sanitize(oversized)).toMatchObject({
      _truncated: true,
    });
  });
});
