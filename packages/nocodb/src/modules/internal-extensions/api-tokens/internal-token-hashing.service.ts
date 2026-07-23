export interface GeneratedInternalToken {
  value: string;
  prefix: string;
}

export abstract class InternalTokenHashingService {
  abstract generate(): GeneratedInternalToken;
  abstract hash(tokenValue: string): Promise<string>;
  abstract verify(tokenValue: string, storedHash: string): Promise<boolean>;
}
