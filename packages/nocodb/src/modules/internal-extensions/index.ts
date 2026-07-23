/**
 * Internal organizational extension boundary.
 *
 * This module is independently implemented and is not connected to NocoDB
 * commercial entitlements or paid-feature activation.
 */
import type { DynamicModule, Type } from '@nestjs/common';
import { InternalExtensionsModule } from './internal-extensions.module';
import { isInternalExtensionsEnabled } from './feature-registry/internal-feature.config';

export { InternalExtensionsModule };

export function getInternalExtensionModuleImports(
  env: NodeJS.ProcessEnv,
): Array<Type<unknown> | DynamicModule> {
  return isInternalExtensionsEnabled(env) ? [InternalExtensionsModule] : [];
}
