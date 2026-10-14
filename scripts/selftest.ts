// Runs INSIDE the container started by scripts/carousel.sh. It proves the isolation is real
// instead of assuming it: every check must fail to do something a compromised process would try.
import { writeFile } from "node:fs/promises";

type Check = { name: string; run: () => Promise<boolean> };

/** True when the action throws, which is the outcome we want from a forbidden action. */
async function isBlocked(action: () => Promise<unknown>): Promise<boolean> {
  try {
    await action();
    return false;
  } catch {
    return true;
  }
}

const checks: Check[] = [
  {
    name: "network is unreachable (fetch to a public address fails)",
    run: () => isBlocked(() => fetch("http://1.1.1.1/", { signal: AbortSignal.timeout(3000) })),
  },
  {
    name: "DNS does not resolve",
    run: () => isBlocked(() => fetch("http://example.com/", { signal: AbortSignal.timeout(3000) })),
  },
  {
    name: "the code directory is read-only",
    run: () => isBlocked(() => writeFile("/app/selftest-should-fail", "x")),
  },
  {
    // Passes for any non-root user, with or without --read-only, so it only shows that
    // image paths are not writable. The read-only root is enforced by the docker flag.
    name: "image paths outside /tmp and /out are not writable",
    run: () => isBlocked(() => writeFile("/etc/selftest-should-fail", "x")),
  },
  {
    name: "the output directory is writable",
    run: async () => !(await isBlocked(() => writeFile("/out/.selftest", "ok"))),
  },
];

let failed = 0;
for (const c of checks) {
  const ok = await c.run();
  console.log(`${ok ? "ok  " : "FAIL"} ${c.name}`);
  if (!ok) failed++;
}
process.exit(failed === 0 ? 0 : 1);
