# Dependencies

Every package that ends up in `bun.lock`, with its version, license and declared install scripts. Verified on 2026-10-14. Nothing here is assumed: each claim names the command that produced it, and anything that could not be checked says "not verified".

How the data was collected (read-only, nothing installed on the host):

- Versions come from `bun.lock` (lockfileVersion 2). `bun install --frozen-lockfile --ignore-scripts` installed 29 packages in a throwaway container.
- License, scripts and repository come from the npm registry: `npm view <pkg>@<version> license scripts repository.url --json`.
- Vulnerabilities come from Trivy (see section 4).

A note on "install scripts": the table column lists only `preinstall`, `install`, `postinstall` and `prepare` as declared in each package's `package.json` metadata on the registry. Publish-time hooks (`prepublish`, `prepack`, `postversion` and similar) are not install hooks and are left out. The project always installs with `--ignore-scripts` (`scripts/carousel.sh setup` and the CI workflow), so no dependency script runs during installation whatever it declares.

## 1. Direct runtime dependencies (2 of a maximum of 4)

| Package | Version | License | Repository | Install scripts | Transitive dependencies | Audit |
| ------- | ------- | ------- | ---------- | --------------- | ----------------------- | ----- |
| satori | 0.57.2 | MPL-2.0 | https://github.com/vercel/satori | `prepare` (`husky install`, a development hook) | 21 (12 declared by satori plus 9 deeper, all listed in section 3) | Trivy: 0 HIGH or CRITICAL findings |
| @resvg/resvg-wasm | 2.6.2 | MPL-2.0 | https://github.com/yisibl/resvg-js (npm `repository.url`) | none declared | 0 (`bun.lock` lists no dependencies for it) | Trivy: 0 HIGH or CRITICAL findings |

Sources: `npm view satori@0.57.2 license scripts repository.url --json` and `npm view @resvg/resvg-wasm@2.6.2 license scripts repository.url --json`. The transitive count was computed by walking the `dependencies` of each entry in `bun.lock` starting from `satori`.

The 12 first-level dependencies of satori are the ones written in its `bun.lock` entry: `@shuding/opentype.js`, `css-background-parser`, `css-box-shadow`, `css-gradient-parser`, `css-to-react-native`, `emoji-regex-xs`, `escape-html`, `fflate`, `harfbuzzjs`, `linebreak`, `parse-css-color` and `postcss-value-parser`.

## 2. Development dependencies (not part of runtime)

| Package | Version | License | Runtime? | Install scripts |
| ------- | ------- | ------- | -------- | --------------- |
| typescript | 5.9.3 | Apache-2.0 | no, type checking only (`tsc --noEmit`) | none declared |
| @types/bun | 1.4.3 | MIT | no, type declarations only | none declared |

Sources: `npm view typescript@5.9.3 license scripts --json` and `npm view @types/bun@1.4.3 license scripts --json`. Their own transitive packages (`bun-types`, `@types/node`, `undici-types`) are in section 3 and are also dev only.

## 3. All transitive dependencies in `bun.lock` (25 entries)

21 are reached from satori at runtime. 4 are reached only from `@types/bun`. `undici-types` appears twice because `bun.lock` pins 8.12.1 at the top level and 8.9.0 nested under `@types/node`.

| Package | Version | License | Scope | Declares preinstall/install/postinstall/prepare |
| ------- | ------- | ------- | ----- | ----------------------------------------------- |
| @shuding/opentype.js | 1.4.0-beta.0 | MIT | runtime (via satori) | none |
| base64-js | 0.0.8 | MIT | runtime (via satori) | none |
| camelize | 1.0.1 | MIT | runtime (via satori) | none |
| color-name | 1.1.4 | MIT | runtime (via satori) | none |
| css-background-parser | 0.1.0 | MIT | runtime (via satori) | none |
| css-box-shadow | 1.0.0-3 | MIT | runtime (via satori) | none |
| css-color-keywords | 1.0.0 | ISC | runtime (via satori) | none |
| css-gradient-parser | 0.0.17 | MIT | runtime (via satori) | none |
| css-to-react-native | 3.2.0 | MIT | runtime (via satori) | none |
| emoji-regex-xs | 2.0.1 | MIT | runtime (via satori) | none |
| escape-html | 1.0.3 | MIT | runtime (via satori) | none |
| fflate | 0.7.3 | MIT | runtime (via satori) | none |
| harfbuzzjs | 0.10.0 | MIT | runtime (via satori) | prepare |
| hex-rgb | 4.3.0 | MIT | runtime (via satori) | none |
| linebreak | 1.1.0 | MIT | runtime (via satori) | none |
| pako | 0.2.9 | MIT | runtime (via satori) | none |
| parse-css-color | 0.2.1 | MIT | runtime (via satori) | none |
| postcss-value-parser | 4.2.0 | MIT | runtime (via satori) | none |
| string.prototype.codepointat | 0.2.1 | MIT | runtime (via satori) | none |
| tiny-inflate | 1.0.3 | MIT | runtime (via satori) | none |
| unicode-trie | 2.0.0 | MIT | runtime (via satori) | none |
| @types/node | 26.6.5 | MIT | dev only (via @types/bun) | none |
| bun-types | 1.4.3 | MIT | dev only (via @types/bun) | none |
| undici-types | 8.12.1 | MIT | dev only (via @types/bun) | none |
| @types/node/undici-types | 8.9.0 | MIT | dev only (via @types/bun) | none |

Result: no transitive package declares `preinstall`, `install` or `postinstall`. Only `harfbuzzjs` declares `prepare` (`make`, a build step for its own repository); `satori` declares `prepare` too (section 1). Source for every row: `npm view <pkg>@<version> license scripts --json`. No package returned an empty or unreadable response, so no row is "not verified".

Licenses in the transitive table: MIT (24 entries) and ISC (`css-color-keywords`). Across the whole lockfile the direct packages add MPL-2.0 (satori, @resvg/resvg-wasm), Apache-2.0 (typescript) and MIT (@types/bun).

## 4. Vulnerability scan (Trivy)

Command:

```
docker run --rm -v "$PWD":/src:ro aquasec/trivy:latest fs --scanners vuln --severity HIGH,CRITICAL --quiet /src
```

Result on 2026-10-14, Trivy 0.75.0 (`docker run --rm aquasec/trivy:latest --version`): target `bun.lock` (type `bun`), 0 vulnerabilities at HIGH or CRITICAL, exit code 0. The CI workflow (`.github/workflows/ci.yml`) runs the same scan on every pull request and push to main with `exit-code: "1"`, using the Trivy version that `aquasecurity/trivy-action` pins by default. It has not run on GitHub yet.

This is a point in time result: the vulnerability database changes daily, so a clean scan today says nothing about tomorrow.

## 5. License note

- Satori: `npm view satori@0.57.2 license` returned `MPL-2.0`.
- @resvg/resvg-wasm: `npm view @resvg/resvg-wasm@2.6.2 license` returned `MPL-2.0`.
- This project is MIT (`LICENSE`).

Both MPL-2.0 packages are used as unmodified dependencies: they are installed from the registry and imported, never copied into `src/` and never patched. MPL-2.0 is a file-level copyleft, so its obligations attach to the MPL-licensed files themselves, and using them unmodified does not require relicensing the project's own MIT files. This is the design decision recorded in `.specs/features/v1/design.md` (Licenses row). This is a summary of the project's reading, not legal advice. If a dependency is ever vendored or patched, revisit this section first.

Fonts are covered separately in `THIRD_PARTY_FONTS.md`.

## 6. Project rule

- At most 4 direct runtime dependencies (today: 2).
- No telemetry.
- No network request at runtime.

How this is enforced:

- `tests/security-static.test.ts` scans `src/` for forbidden patterns (dynamic code and network APIs) and fails the test run on a hit.
- `scripts/carousel.sh selftest` runs `scripts/selftest.ts` inside the locked-down container (`--network none`, read-only root, read-only code, no capabilities) and checks that network, DNS and writes outside the output directory are all blocked. CI runs it too.
- `scripts/carousel.sh validate` and `render` run in that same container, so a dependency that tried to reach the network would fail there.

## 7. How to re-audit when Dependabot opens a pull request

Dependabot is configured in `.github/dependabot.yml` (weekly, for `bun` and `github-actions`). For each pull request:

1. Read the diff of `package.json` and `bun.lock`. A new package in `bun.lock` is a new transitive dependency: treat it as new code.
2. For every added or changed package run `npm view <pkg>@<new-version> license scripts repository.url --json` (read-only) and check that the license is still compatible with MIT and that no `preinstall`, `install` or `postinstall` appeared.
3. Check the count of direct runtime dependencies stays at 4 or fewer.
4. Install only in a throwaway container: `docker run --rm --user $(id -u):$(id -g) -e HOME=/tmp -v "$PWD":/app -w /app oven/bun:1 bun install --frozen-lockfile --ignore-scripts`.
5. Run the checks: `bunx tsc --noEmit && bun test` (in the container) and `scripts/carousel.sh selftest`.
6. Re-run the Trivy command from section 4 and compare with the numbers above.
7. For GitHub Actions updates, resolve the new tag to a full commit SHA with `gh api repos/<owner>/<repo>/git/ref/tags/<tag>` (dereference annotated tags through `git/tags/<sha>`), confirm it with `gh api repos/<owner>/<repo>/commits/<sha>`, and keep the tag as a comment on the same line.
8. Update the tables in this file in the same pull request.
