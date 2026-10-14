#!/usr/bin/env bash
# Runs sourced-carousel inside a throwaway, locked-down container.
#
#   scripts/carousel.sh setup                                   install dependencies (the only step with network)
#   scripts/carousel.sh validate <slides.json> [--facts <file>]
#   scripts/carousel.sh render   <slides.json> [--facts <file>] [--out <dir>]
#   scripts/carousel.sh selftest                                prove the isolation works
#
# validate and render run with no network, a read-only root filesystem, no Linux
# capabilities, the code mounted read-only, and only the output directory writable.
# Exit codes: 0 done, 1 validation errors, 2 bad arguments or unreadable file,
# 3 render, pdf or write failure, 4 the container could not be started.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Pinned by digest so the base image cannot change underneath you. Override with CAROUSEL_IMAGE.
IMAGE="${CAROUSEL_IMAGE:-oven/bun@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598}"

die() { echo "error: $*" >&2; exit 2; }

command -v docker >/dev/null 2>&1 || { echo "error: docker is required" >&2; exit 4; }

# Absolute path of an existing file or directory. Rejects characters that would break --mount.
abspath() {
  local p="$1"
  case "$p" in *,* | *$'\n'*) die "path contains a comma or newline: $p" ;; esac
  [ -e "$p" ] || die "cannot read $p: not found"
  if [ -d "$p" ]; then (cd "$p" && pwd); else echo "$(cd "$(dirname "$p")" && pwd)/$(basename "$p")"; fi
}

bind() { echo "type=bind,src=$1,dst=$2$3"; }

SECURE=(
  --rm
  --network none
  --read-only
  --cap-drop ALL
  --security-opt no-new-privileges
  --pids-limit 256
  --memory 1g
  --tmpfs /tmp:rw,noexec,nosuid,size=128m
  --user "$(id -u):$(id -g)"
  -e HOME=/tmp
  --workdir /app
)

need_deps() {
  [ -d "$ROOT/node_modules" ] || { echo "error: dependencies are not installed, run: scripts/carousel.sh setup" >&2; exit 2; }
}

cmd="${1:-}"
[ $# -gt 0 ] && shift

case "$cmd" in
  setup)
    # The only step that may use the network. Install scripts stay disabled and the lockfile is frozen.
    exec docker run --rm --cap-drop ALL --security-opt no-new-privileges --user "$(id -u):$(id -g)" \
      -e HOME=/tmp --workdir /app --mount "$(bind "$ROOT" /app "")" "$IMAGE" \
      bun install --frozen-lockfile --ignore-scripts
    ;;

  selftest)
    need_deps
    out="$(mktemp -d)"
    trap 'rm -rf "$out"' EXIT
    docker run "${SECURE[@]}" \
      --mount "$(bind "$ROOT" /app ,readonly)" --mount "$(bind "$out" /out "")" "$IMAGE" \
      bun scripts/selftest.ts
    ;;

  validate | render)
    need_deps
    slides="" facts="" out=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --facts) [ $# -ge 2 ] || die "--facts needs a file"; facts="$2"; shift 2 ;;
        --out)
          [ "$cmd" = render ] || die "--out only works with render"
          [ $# -ge 2 ] || die "--out needs a directory"; out="$2"; shift 2 ;;
        --*) die "unknown option: $1" ;;
        *) [ -z "$slides" ] || die "unexpected argument: $1"; slides="$1"; shift ;;
      esac
    done
    [ -n "$slides" ] || die "missing slides file. usage: scripts/carousel.sh $cmd <slides.json> [--facts <file>]"

    slides_abs="$(abspath "$slides")"
    [ -f "$slides_abs" ] || die "cannot read $slides: not a file"
    mounts=(--mount "$(bind "$ROOT" /app ,readonly)" --mount "$(bind "$(dirname "$slides_abs")" /in/slides ,readonly)")
    args=("$cmd" "/in/slides/$(basename "$slides_abs")")

    if [ -n "$facts" ]; then
      facts_abs="$(abspath "$facts")"
      [ -f "$facts_abs" ] || die "cannot read $facts: not a file"
      mounts+=(--mount "$(bind "$(dirname "$facts_abs")" /in/facts ,readonly)")
      args+=(--facts "/in/facts/$(basename "$facts_abs")")
    fi

    if [ "$cmd" = render ]; then
      out="${out:-out}"
      case "$out" in *,* | *$'\n'*) die "path contains a comma or newline: $out" ;; esac
      mkdir -p "$out"
      out_abs="$(cd "$out" && pwd)"
      mounts+=(--mount "$(bind "$out_abs" /out "")")
      args+=(--out /out)
    fi

    docker run "${SECURE[@]}" "${mounts[@]}" "$IMAGE" bun src/cli.ts "${args[@]}"
    ;;

  *)
    echo "usage: scripts/carousel.sh <setup|validate|render|selftest> ..." >&2
    exit 2
    ;;
esac
