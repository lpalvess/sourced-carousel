# sourced-carousel

English | [Português](README.md)

![Example carousel made with sourced-carousel: six slides in the dark theme, with the 42% figure and the source footer](docs/images/hero.png)

Generates a LinkedIn carousel as PDF and PNG from a `slides.json`, and rejects the carousel if any number is missing from the facts file you provide. It runs in a container with no network and no browser. It is also a Claude Code skill (see [SKILL.md](SKILL.md), written in Portuguese).

## Why it exists

A data carousel often has numbers that become "true" just because they sit in a nice image. This project adds a simple gate: every number on the slides must appear, written exactly the same way, in a facts file with the literal quote from the source and the link. If it does not, no PDF is produced.

It also rejects em dashes, en dashes and arrows in the text, and limits how much text each slide can hold.

## Architecture

![Architecture: the source is read outside the container and becomes facts.md and slides.json; inside the container with no network, validate checks every number against the facts, render draws with Satori and resvg, pdf builds the carousel, and only the out/ folder is writable](docs/diagrams/architecture.en.png)

The source is read outside the container. Inside it, with no network, `validate` checks the rules and every number against the facts. If everything passes, `render` draws the slides (Satori for SVG, resvg for PNG) and `pdf` builds the carousel in `out/`, the only writable folder. If any number is not in the facts, nothing is generated.

The editable diagram files are in [docs/diagrams/](docs/diagrams/): `architecture.en.excalidraw` (opens at excalidraw.com) and `architecture.en.drawio` (opens in draw.io).

## Installation

Docker is required. The project's code only runs in a container.

```
git clone https://github.com/lpalvess/sourced-carousel.git
cd sourced-carousel
scripts/carousel.sh setup      # installs dependencies in the container; the only step with network
scripts/carousel.sh selftest   # proves the container has no network and cannot write outside out
```

### Use it as a Claude Code skill

Install it as a plugin, straight from this repository. In your terminal:

```
claude plugin marketplace add lpalvess/sourced-carousel
claude plugin install sourced-carousel@sourced-carousel
```

Or, inside a Claude Code session (version 2.1.275 or later):

```
/plugin install sourced-carousel --marketplace lpalvess/sourced-carousel
```

The first time, ask the skill to run `setup`, which installs the dependencies in the container and is the only step with network. Then ask, from any folder, for example: "make a carousel from this post using the facts in facts.md". The skill proposes a slide plan, waits for your approval, validates, writes the PDF to `out/` and never publishes anything.

Two things to know before you install it as a plugin:

- On install, Claude Code itself installs the dependencies from `bun.lock` into the plugin folder, if Bun is on your PATH. According to the Claude Code documentation, this install runs no package scripts and uses only the versions pinned in the lockfile. The project's code still runs only in the container.
- The skill only works in Claude Code, because it needs Docker and a bash script. It does not run in claude.ai chat.

If you cloned the repository, you can also load the plugin for one session: `claude --plugin-dir /path/to/sourced-carousel`.

## Full example

The files in `examples/` are FICTIONAL: an invented company, invented numbers and an example link. The example text is in Portuguese.

```
scripts/carousel.sh validate examples/slides.json --facts examples/facts.md
scripts/carousel.sh render   examples/slides.json --facts examples/facts.md --out out
```

`validate` prints nothing and exits 0 when there are no errors or warnings. `render` validates first, prints `slide 1/6` through `slide 6/6`, and writes six PNGs to `out/` (`01-hook.png`, `02-number.png`, and so on) plus a six-page `carousel.pdf`.

If a number on a slide is not in the facts (for example, changing `42%` to `43%`), the result is:

```
error slide 2 number-not-in-facts: slide 2 has the number "43%" which is not in the facts file
```

and the exit code is 1.

![The validator rejects the slide that says 43% when the facts file only has 42%](docs/images/validate-fails.png)

The same example in the light theme and the portrait format (`"meta": { "theme": "light", "format": "linkedin-portrait" }`):

![Three example slides in the light theme and portrait format](docs/images/light-portrait.png)

The images above are the tool's real output on `examples/`, laid out on a page and captured with Playwright in a container without network. Playwright is not part of the project.

### The facts file

Any text works. The recommended format is one line per fact, with number, context, literal quote and link:

```
- 42% | drop in time spent in status meetings | "time spent fell 42% in the pilot" | https://example.com/report
```

The validator looks for each number from the slides as exact text inside this file.

### How the source is checked

The container has no network, so it never opens the source. Checking happens in two steps:

1. **Before, outside the container.** You (or the agent, when you use the skill) read the original source and copy each number into the facts file with the literal quote and the link. The quote is copied word for word, never from memory.
2. **Inside the container, with no network.** The validator compares every number on the slides with the facts file. If a number is not there, written the same way, the PDF is not generated.

The network stays off for security: the code that reads your text and builds the PDF cannot send anything out or download anything. That is why the validator confirms that a number came from the facts file, but not that the quote is right in the source. That final check is yours, and the skill hands you the list of facts it used (number, quote and link) to make it easier.

## Slide types

`slides.json` has an optional `meta` and `slides`, from 3 to 10. Every slide accepts `source` (footer, up to 80 characters) and `highlight` (1 or 2 words from the slide itself, drawn in the accent color).

| type | Required fields | Notes |
| ---- | --------------- | ----- |
| `hook` | `text` | Up to 3 lines. Opening slide. |
| `text` | `title`, `text` | `text` up to 40 words. |
| `number` | `value`, `label` | `value` is the big figure, such as `42%`. |
| `list` | `title`, `items` | 1 to 6 items. |
| `quote` | `text`, `author` | A quotation. |
| `cta` | `text`, `handle` | Closing slide. |

`meta` accepts `theme` (`dark`, the default, or `light`), `format` (`linkedin-square` 1080x1080, the default, or `linkedin-portrait` 1080x1350) and `accent` (a `#RRGGBB` color).

## Validator rules

Each finding is printed as `<severity> slide <N> <rule-id>: <message>`.

| ID | Severity | What it rejects |
| -- | -------- | --------------- |
| `schema-invalid` | error | Invalid JSON, structure outside the schema, or invalid `meta`. |
| `type-unknown` | error | A slide with no `type` or an unknown type. |
| `field-missing` | error | A required field of the type is missing, or `items` is outside 1 to 6. |
| `slide-count` | error | Fewer than 3 or more than 10 slides. |
| `too-many-words` | error | `text` of a `text` slide with more than 40 words. |
| `hook-too-long` | error | A `hook` with more than 3 lines. |
| `highlight-invalid` | error | An empty `highlight`, one with more than 2 words, or one that does not appear in the slide. |
| `source-too-long` | error | A `source` with more than 80 characters. |
| `forbidden-char` | error | An em dash, an en dash, other dashes (U+2012, U+2015, U+FE58, U+FF0D), any arrow from the Unicode arrow blocks, and the sequences `->`, `=>` and `<-`, in any text. A plain hyphen and the minus sign (U+2212) are allowed. |
| `number-not-in-facts` | error | A number outside `source` that is not in the facts file. The number is compared whole and as written: `42%` is not in `142%`, nor in `42`; the sign and the unit (`%`, `K`, `mil`, `M`) are part of the number. |
| `non-ascii-digit` | error | Digits other than 0 to 9 (for example Arabic-Indic), which cannot be compared with the facts file. Full-width digits are converted and accepted. |
| `structure` | warning | The first slide is not a `hook` or the last is not a `cta`. |
| `facts-skipped` | warning | There are numbers but `--facts` was not given. |

## Exit codes

| Code | Meaning |
| ---- | ------- |
| 0 | No errors (warnings do not count). |
| 1 | Validation error. |
| 2 | Wrong arguments, unreadable file, or dependencies not installed. |
| 3 | Render failure (render, pdf or write step). No `carousel.pdf` is left on disk. |
| 4 | The container could not be started (for example, Docker is missing). |

## Security

What the project guarantees, by construction:

- Validate and render run in a container with `--network none`: no network at run time, no telemetry.
- The code is mounted read-only, the root filesystem is read-only, all Linux capabilities are dropped, and only the output directory is writable.
- No browser is used. Drawing is done with Satori and resvg-wasm.
- The input is JSON read as data and never executed, and all text is drawn as text.
- 2 direct runtime dependencies (`satori` and `@resvg/resvg-wasm`), with exact versions. Installation uses a frozen lockfile with install scripts disabled. Details are in [docs/dependencies.md](docs/dependencies.md).
- The container base image is pinned by digest.

What the project does NOT guarantee:

- That the number is right in the source. The validator only confirms that the number came from the facts file. You are the one who checks the quote against the source.
- That the text in the PDF is selectable. Pages are images.
- The security of Docker itself. The isolation depends on Docker and on your system.

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## Known limitations

- Text in the PDF becomes an image and is not selectable.
- Text fitting is a conservative estimate. If the text does not fit even at the minimum size, render fails with `text-overflow`.
- A 3-line hook may wrap onto more lines when rendered. Check the PNGs.
- Only two formats (LinkedIn square and portrait) and two themes.
- The validator only checks numbers written with digits. A spelled out number ("thirty thousand") is not checked: always write numbers with digits.
- Only the units in the list are checked (`%`, `x`, `×`, `K`, `k`, `M`, `B`, `mil`, `mi`, `bi`, `milhão`, `milhões`, `bilhão`, `bilhões`, `thousand`, `million`, `billion`). Any other unit (`5 pp`, `2 trilhões`, `15 por cento`) is not checked: write the number with a unit from the list or with none.
- A thousands separator with spaces (`1 000 000`) and scientific notation (`1e3`) are not checked as a single number.
- Digits glued to letters (`Q4`, `10h30`, `ISO27001`) are not checked.
- The validator confirms that the number came from the facts file, not that the quote is right in the source. That part is up to you.
- The static security test in `tests/security-static.test.ts` is a pattern heuristic over `src/`. The real defense is the container without network.

## What this project does not do

- It does not write the post text.
- It does not publish to any social network.
- It has no visual editor.
- It does not generate images with AI and does not place images on slides.

## Similar projects

Other projects that also generate carousels and may fit your case better:

- [ContentHub](https://github.com/thallisribeiro/contenthub): generates content and carousels for Instagram.
- [threads-carousel-claude-skill](https://github.com/itchernetski/threads-carousel-claude-skill): a Claude Code skill that turns posts into carousels, with a browser preview. It inspired this project.
- [linkedin-carousel-gen](https://github.com/Slashgear/linkedin-carousel-gen): generates LinkedIn carousel PDFs with Satori and Bun.

## License and credits

- Code under the MIT license, see [LICENSE](LICENSE).
- Inter font, OFL license, see [THIRD_PARTY_FONTS.md](THIRD_PARTY_FONTS.md).
- Diagrams made with [Excalidraw](https://excalidraw.com) and the [drawio-skills](https://github.com/bahayonghang/drawio-skills) skill (MIT).
- Satori and resvg-wasm are MPL-2.0 and used without modification. See [docs/dependencies.md](docs/dependencies.md).
