# 066 — Node 22 private R2 CLI warning isolation

**Status/date/writer:** PLANNED / 2026-09-25 / primary agent.

**Observable result:** The two private R2 operator entrypoint tests retain machine-readable JSON
stderr on the repository CI's Node 22.13.1 without suppressing application failures or changing
copy/manifest behavior.

**Delivery focus:** Unblock the exact release candidate's required Quality and security CI job.
Native checks and 30/30 browser regression already pass at `12a236f`; this brief repairs only the
two Node-version-specific CLI boundary failures. No provider, database, file copy or deployment is
part of this package.

**Start evidence:** GitHub Actions run `36143657251` checked out exact SHA `12a236f`. Native product
checks passed and browser regression passed 30/30. Root lint and typecheck passed, then coverage
reported 795/797 passing. The only failures were `scripts/private-r2-copy.test.ts:449` and
`scripts/private-r2-manifest.test.ts:418`: Node 22's experimental type-stripping warning preceded
the expected JSON stderr. Local Node is 24.13.1 and did not reproduce that warning.

**Current work card:** Add the narrow Node `ExperimentalWarning` suppression to both TypeScript CLI
entrypoints and their direct child-process invocations; run focused tests plus root `pnpm check`;
push the fast-forward repair to the approved candidate branch and require all CI jobs to pass.

**Resources:** Existing dependencies only; no download, database, browser, simulator or provider.
One root test/build process at a time; about 38 GiB free. Remove only generated `.next`/coverage
owned by this repair after evidence is captured.

## Transition start check

- Read `AGENTS.md`, handoff, active context, WF-011, the failing CI log, affected source/tests and
  delivery controls. One result: Node 22 machine-readable CLI boundary compatibility.
- Allowed product/test files: `scripts/private-r2-copy.ts`, `scripts/private-r2-manifest.ts`,
  `scripts/private-r2-copy.test.ts`, `scripts/private-r2-manifest.test.ts`. This brief and current
  handoff/status records may be updated separately.
- Preserve every manifest/copy validation, approval, credential, path, cap and fail-closed rule.
  Do not silence arbitrary child-process stderr or weaken JSON assertions.
- Local scoped fix/test/commit and the already approved candidate-branch CI/preview retry are in
  scope. `main`, production, provider, hosted DB, credentials, real objects and device remain out.
- Required checks: focused two-file tests, root `pnpm check`, exact diff review, candidate CI's
  three jobs, Vercel preview result, links and `git diff --check`.
- Rollback: revert the product/test commit; no external data rollback exists because no data action
  is permitted. Preserve `supabase/.temp/cli-latest` unstaged.

## Planned change

Use Node's code-specific `--disable-warning=ExperimentalWarning` alongside the existing
`--disable-warning=MODULE_TYPELESS_PACKAGE_JSON` in the two shebangs and direct test invocations.
This removes only the runtime's experimental type-stripping notice from the operator protocol;
script validation errors must remain the sole JSON stderr value and are still asserted exactly.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? | Status | Evidence and limit |
|---|---|---|---|
| Both real CLI entrypoints preserve exact JSON refusal output under the supported invocation | yes | NOT RUN | Focused tests after implementation. |
| Existing copy/manifest behavior and root gate remain compatible | yes | NOT RUN | Focused suites and `pnpm check`. |
| Exact candidate CI quality, browser and native jobs pass | yes | NOT RUN | Fast-forward candidate branch and new GitHub run. |
| Vercel preview reaches Ready for the repaired candidate | yes | NOT RUN | Signed-in read-only Vercel inspection. |
| Hosted/provider/data/device/store behavior | no — outside repair | NOT RUN | No such action or inference. |

Required FAIL or NOT RUN keeps 066 open. Self-review is not independent review.
