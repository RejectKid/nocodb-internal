import type { InternalFieldValidationConfiguration } from './internal-validation.types';
import { InternalValidationEngine } from './internal-validation.engine';

const configuration = (
  fieldKey: string,
  rules: InternalFieldValidationConfiguration['rules'],
): InternalFieldValidationConfiguration => ({
  id: 'rule-1',
  workspaceId: 'workspace-1',
  baseId: 'base-1',
  modelId: 'model-1',
  fieldKey,
  rules,
  revision: 1,
  updatedBy: 'user-1',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
});

describe('InternalValidationEngine', () => {
  const engine = new InternalValidationEngine();

  it('returns field and rule identifiers for invalid direct API data', () => {
    expect(
      engine.validate(
        [{ Name: '', Amount: 3.14 }],
        [
          configuration('Name', [{ type: 'required' }]),
          configuration('Amount', [{ type: 'integer' }]),
        ],
        'create',
      ),
    ).toEqual([
      expect.objectContaining({ field: 'Name', rule: 'required' }),
      expect.objectContaining({ field: 'Amount', rule: 'integer' }),
    ]);
  });

  it('does not require omitted fields during partial updates', () => {
    expect(
      engine.validate(
        [{ Other: 'value' }],
        [configuration('Name', [{ type: 'required' }])],
        'update',
      ),
    ).toEqual([]);
  });

  it('validates attachment type, size, and count', () => {
    const failures = engine.validate(
      [
        {
          Files: [
            {
              title: 'unsafe.exe',
              mimetype: 'application/x-msdownload',
              size: 11,
            },
            {
              title: 'second.exe',
              mimetype: 'application/x-msdownload',
              size: 1,
            },
          ],
        },
      ],
      [
        configuration('Files', [
          { type: 'fileType', value: ['image/*', 'application/pdf'] },
          { type: 'fileSize', value: 10 },
          { type: 'maxAttachmentCount', value: 1 },
        ]),
      ],
      'create',
    );
    expect(failures.map(({ rule }) => rule)).toEqual([
      'fileType',
      'fileSize',
      'maxAttachmentCount',
    ]);
  });

  it('rejects regular expressions with common catastrophic constructs', () => {
    expect(() =>
      engine.assertRegexIsSafe({ type: 'regex', value: '(a+)+$' }),
    ).toThrow('Unsafe regular expression');
  });
});
