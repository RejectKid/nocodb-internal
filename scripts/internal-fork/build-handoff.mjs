import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { smokeHandoff } from './smoke-handoff.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runId = process.env.NC_HANDOFF_RUN || `local.${Date.now()}`;
if (!/^[a-z0-9.]+$/.test(runId)) throw new Error('Invalid NC_HANDOFF_RUN');
const name = `nocodb-handoff-${runId}`;
const output = path.join(root, '.handoff-output');
const bundle = path.join(output, name);
const context = path.join(root, '.handoff-build', `context-${runId}`);
const qa = path.join(root, '.handoff-build', `qa-${runId}`);
const image = `nocodb-internal:0.301.3-internal.${runId}`;
const project = `handoff-qa-${runId.replaceAll('.', '-')}`;
const pg = 'postgres:17.10';
const redis = 'redis:7.4-alpine';
const pgDigest = 'sha256:a426e44bac0b759c95894d68e1a0ac03ecc20b619f498a91aae373bf06d8508d';
const redisDigest = 'sha256:e7723ff73d963f5cc6d9c4643ea3d989527a402a319239054e9472a7fb9219a2';

function run(command, args, cwd = root, env = {}) {
  const result = spawnSync(command, args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
}
function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr}`);
  return result.stdout.trim();
}
async function hash(file) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest('hex');
}
async function files(dir, prefix = '') {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await files(path.join(dir, entry.name), relative));
    else if (entry.isFile()) result.push(relative);
    else throw new Error(`Unexpected non-file in bundle: ${relative}`);
  }
  return result.sort();
}

await mkdir(output, { recursive: true });
// Never overwrite a previous handoff or reuse an existing QA database.
await mkdir(bundle);
await mkdir(context, { recursive: true });
await mkdir(qa);
const commit = capture('git', ['rev-parse', 'HEAD']);
run('docker', ['info', '--format', '{{.ServerVersion}}']);
await cp(path.join(root, 'deploy/internal-fork/handoff'), bundle, { recursive: true });
for (const relative of await files(bundle)) {
  if (relative.endsWith('.sh')) {
    const file = path.join(bundle, relative);
    await writeFile(file, (await readFile(file, 'utf8')).replaceAll('\r\n', '\n'));
  }
}
await mkdir(path.join(bundle, 'images'));
for (const doc of ['admin-documents-usage.md', 'internal-teams-usage.md', 'self-hosted-business-parity.md', 'teams-validation-report.md']) {
  await cp(path.join(root, 'docs/internal-fork', doc), path.join(bundle, doc));
}
await cp(path.join(root, 'LICENSE.md'), path.join(bundle, 'LICENSE.md'));
let compose = await readFile(path.join(bundle, 'compose.yaml'), 'utf8');
compose = compose.replaceAll('__HANDOFF_IMAGE__', image);
await writeFile(path.join(bundle, 'compose.yaml'), compose);
await writeFile(path.join(qa, 'compose.yaml'), compose);
await writeFile(path.join(qa, '.env'), `POSTGRES_PASSWORD=${randomBytes(32).toString('hex')}\nNC_AUTH_JWT_SECRET=${randomBytes(32).toString('hex')}\n`, { mode: 0o600 });
await cp(path.join(root, 'deploy/internal-fork/Dockerfile.handoff'), path.join(context, 'Dockerfile'));
await cp(path.join(root, '.handoff-build/backend'), path.join(context, 'backend'), { recursive: true });
await cp(path.join(root, 'packages/nc-gui/.output/public'), path.join(context, 'frontend'), { recursive: true });
run('docker', ['build', '--platform', 'linux/amd64', '--build-arg', `SOURCE_COMMIT=${commit}`, '--build-arg', `INTERNAL_IMAGE_VERSION=${image.split(':')[1]}`, '-t', image, context]);
for (const [tag, digest] of [[pg, pgDigest], [redis, redisDigest]]) {
  run('docker', ['pull', '--platform', 'linux/amd64', `${tag}@${digest}`]);
  run('docker', ['tag', `${tag}@${digest}`, tag]);
}
const qaEnv = { NC_PORT: '18086', NC_BIND_IP: '127.0.0.1', NC_SITE_URL: 'http://127.0.0.1:18086' };
function composeRun(args) { run('docker', ['compose', '-p', project, ...args], qa, qaEnv); }
try {
  composeRun(['up', '-d', '--wait', '--wait-timeout', '240']);
  const saved = await smokeHandoff(qaEnv.NC_SITE_URL);
  if (!/^[a-zA-Z0-9_-]+$/.test(saved.documentId)) throw new Error('Invalid document ID');
  composeRun(['down']); // Preserve QA volumes for the persistence check.
  composeRun(['up', '-d', '--wait', '--wait-timeout', '240']);
  // Read the record directly through the database: restart must preserve it.
  composeRun(['exec', '-T', 'db', 'psql', '-U', 'nocodb', '-d', 'nocodb', '-v', 'ON_ERROR_STOP=1', '-c',
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM nc_internal_documents WHERE id = '${saved.documentId}') THEN RAISE EXCEPTION 'Document lost after restart'; END IF; END $$;`]);
  await writeFile(path.join(bundle, 'BUNDLE-TEST-RESULTS.txt'),
    `Source ${commit}\nPASS: fresh Compose health (app/worker/PostgreSQL/Redis), frontend HTML/asset HTTP responses, initial signup, authenticated registry/admin, team grant/removal, unauthorized and anonymous denials, JSON export restrictions, restart persistence.\nThis automated smoke checks APIs and asset delivery, not rendered browser interactions or every Business feature. Source lint/full-GUI type-check limitations are documented separately. No QA data or credentials are bundled.\n`);
} catch (error) {
  // Do not upload application logs containing test session values.
  console.error('Handoff smoke failed; ZIP will not be published.');
  throw error;
} finally {
  // Explicitly generated disposable project only; never a user deployment.
  composeRun(['down', '--volumes']);
}
const tags = [image, pg, redis];
const archives = ['nocodb-internal.tar', 'postgres.tar', 'redis.tar'];
for (let i = 0; i < tags.length; i++) {
  const archive = path.join(bundle, 'images', archives[i]);
  run('docker', ['save', '--output', archive, tags[i]]);
  run('docker', ['load', '--input', archive]);
}
await writeFile(path.join(bundle, 'BUILD-INFO.txt'), `Source commit: ${commit}\nPlatform: linux/amd64\nCreated: ${new Date().toISOString()}\n${tags.map((tag) => `${tag}: ${capture('docker', ['image', 'inspect', tag, '--format', '{{.Id}} {{.Os}}/{{.Architecture}}'])}`).join('\n')}\nLicense/entitlement code is unchanged. No production-readiness claim.\n`);
const manifest = [];
for (const relative of await files(bundle)) {
  if (relative === '.env' || relative === 'CREDENTIALS.txt') throw new Error('Refusing to package secrets');
  manifest.push(`${await hash(path.join(bundle, relative))}  ${relative}`);
}
await writeFile(path.join(bundle, 'MANIFEST.sha256'), manifest.join('\n') + '\n');
const zip = path.join(output, name + '.zip');
if (process.platform === 'win32') {
  run('powershell', ['-NoProfile', '-Command', "Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory($env:NC_BUNDLE_DIR,$env:NC_BUNDLE_ZIP,[IO.Compression.CompressionLevel]::Fastest,$false); $z=[IO.Compression.ZipFile]::OpenRead($env:NC_BUNDLE_ZIP); try { foreach($e in $z.Entries) { $s=$e.Open(); try { $s.CopyTo([IO.Stream]::Null) } finally { $s.Dispose() } } } finally { $z.Dispose() }"], root, { NC_BUNDLE_DIR: bundle, NC_BUNDLE_ZIP: zip });
} else {
  run('zip', ['-q', '-r', '-1', zip, '.'], bundle);
  run('unzip', ['-tq', zip]);
}
await writeFile(zip + '.sha256', `${await hash(zip)}  ${path.basename(zip)}\n`);
console.log(`Handoff ready: ${zip} (${(await stat(zip)).size} bytes)`);
