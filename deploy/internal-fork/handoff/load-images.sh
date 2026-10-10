#!/usr/bin/env sh
set -eu

bundle_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

command -v docker >/dev/null 2>&1 || {
  echo 'Docker is not installed or is not available on PATH.' >&2
  exit 1
}
docker info >/dev/null 2>&1 || {
  echo 'Docker is installed, but its engine is not running.' >&2
  exit 1
}

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$bundle_root" && sha256sum --check MANIFEST.sha256)
elif command -v shasum >/dev/null 2>&1; then
  (cd "$bundle_root" && shasum --algorithm 256 --check MANIFEST.sha256)
else
  echo 'A SHA-256 utility (sha256sum or shasum) is required.' >&2
  exit 1
fi

found=false
for archive in "$bundle_root"/images/*.tar; do
  [ -f "$archive" ] || continue
  found=true
  echo "Loading $(basename "$archive")..."
  docker load --input "$archive"
done

[ "$found" = true ] || {
  echo "No image archives were found in $bundle_root/images" >&2
  exit 1
}

echo 'All images loaded successfully.'
