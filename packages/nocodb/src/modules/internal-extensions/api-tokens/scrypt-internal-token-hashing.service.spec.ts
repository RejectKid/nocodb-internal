import { ScryptInternalTokenHashingService } from './scrypt-internal-token-hashing.service';

describe('ScryptInternalTokenHashingService', () => {
  const service = new ScryptInternalTokenHashingService();

  it('generates a prefixed one-time secret', () => {
    const generated = service.generate();

    expect(generated.prefix).toMatch(/^nci_[A-Za-z0-9_-]{12}$/);
    expect(generated.value).toMatch(
      new RegExp(`^${generated.prefix}_[A-Za-z0-9_-]{43}$`),
    );
  });

  it('stores a salted hash that verifies only the original token', async () => {
    const token = service.generate().value;
    const storedHash = await service.hash(token);

    expect(storedHash).not.toContain(token);
    await expect(service.verify(token, storedHash)).resolves.toBe(true);
    await expect(service.verify(`${token}x`, storedHash)).resolves.toBe(false);
  });

  it('produces different hashes for the same token', async () => {
    const token = service.generate().value;

    await expect(service.hash(token)).resolves.not.toBe(
      await service.hash(token),
    );
  });

  it('fails closed for an unknown or malformed hash version', async () => {
    await expect(service.verify('token', 'scrypt$v2$invalid')).resolves.toBe(
      false,
    );
  });
});
