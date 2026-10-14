# Security Policy

## Supported versions

There are no releases yet. Only the latest commit on `main` is supported.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Use GitHub private vulnerability reporting: open the repository's **Security** tab and choose **Report a vulnerability**. Include the affected commit, a minimal `slides.json` (or other input) that reproduces the problem, and the impact you expect.

We aim to acknowledge a report within 7 days.

## Scope

In scope:

- Code execution triggered by input files (`slides.json`, the facts file, CLI arguments).
- Any network access at runtime. The tool is designed to work fully offline.
- Writes outside the `out/` directory.
- A vulnerability in a dependency that affects this project.

## Not supported

- Issues that need a modified copy of the code, or a modified container or sandbox setup.
- Running the tool outside the provided container script and then reporting problems caused by that environment.
- Findings in dependencies that do not affect this project in practice.
- Visual or layout bugs, and unreadable output for very long text (open a regular issue instead).
- Older commits and forks.
