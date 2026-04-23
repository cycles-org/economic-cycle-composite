# scratch/

Historical exploration scripts kept for reference only. **Not part of the production pipeline.**

These `.mjs` files were used during the initial research phase to:
- Test momentum transformations against raw levels
- Compare CRSI band scoring approaches
- Validate the liquidity composite against Howell's GLI
- Optimize per-series weights via backtest

They are not imported by the app, not maintained, and may have stale assumptions (old 3-tier L5 architecture, outdated weights, etc.). Refer to `src/services/liquidityPipeline.ts` for the current implementation and `docs/` for the current methodology.

If you need to re-run a backtest, use the TypeScript versions in `../scripts/` which target the current architecture.
