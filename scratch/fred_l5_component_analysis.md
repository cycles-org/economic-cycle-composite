══════════════════════════════════════════════════════════════════════
FRED L5 COMPONENT CYCLE DECOMPOSITION vs TLI
══════════════════════════════════════════════════════════════════════

TLI observations (2014-2026): 148
Date range: 2014-01-01 to 2026-04-01

TLI 12-month differences: 136 observations

## Fetching FRED L5 Components

Fetching WALCL (WALCL-W:FDS) — Fed total assets...
  Retrieved 1221 bars
  Sampled at 148/148 snapshot dates
  Valid 12-month diff pairs: 136
  Level corr with TLI: -0.0460
  12-month diff corr with TLI: -0.1323

Fetching TOTBKCR (TOTBKCR-W:FDS) — US bank credit...
  Retrieved 2783 bars
  Sampled at 148/148 snapshot dates
  Valid 12-month diff pairs: 136
  Level corr with TLI: -0.0537
  12-month diff corr with TLI: -0.3541

Fetching WRESBAL (WRESBAL-W:FDS) — Reserve balances...
  Retrieved 2210 bars
  Sampled at 148/148 snapshot dates
  Valid 12-month diff pairs: 136
  Level corr with TLI: 0.1139
  12-month diff corr with TLI: 0.2469

Fetching COMPOUT (COMPOUT-W:FDS) — Commercial paper outstanding...
  Retrieved 1323 bars
  Sampled at 148/148 snapshot dates
  Valid 12-month diff pairs: 136
  Level corr with TLI: -0.0396
  12-month diff corr with TLI: -0.0036

Fetching WRMFNS (WRMFNS-W:FDS) — Retail money funds...
  Retrieved 2410 bars
  Sampled at 148/148 snapshot dates
  Valid 12-month diff pairs: 136
  Level corr with TLI: 0.0493
  12-month diff corr with TLI: 0.4340


══════════════════════════════════════════════════════════════════════
COMPONENT CORRELATIONS WITH TLI (2014-2026)
══════════════════════════════════════════════════════════════════════

| Component | Description | Level r | 12mo Diff r | N |
|-----------|-------------|---------|-------------|---|
| WRMFNS | Retail money funds | 0.0493 | 0.4340 | 136 |
| TOTBKCR | US bank credit | -0.0537 | -0.3541 | 136 |
| WRESBAL | Reserve balances | 0.1139 | 0.2469 | 136 |
| WALCL | Fed total assets | -0.0460 | -0.1323 | 136 |
| COMPOUT | Commercial paper outstanding | -0.0396 | -0.0036 | 136 |

**Reference**: FRED L5 composite vs TLI (12-month diffs): r = 0.1876

**Most correlated with TLI at cycle scale**: WRMFNS (r=0.4340)
  → Retail money funds

**Least correlated with TLI at cycle scale**: COMPOUT (r=-0.0036)
  → Commercial paper outstanding

══════════════════════════════════════════════════════════════════════
INTERPRETATION
══════════════════════════════════════════════════════════════════════

### Which FRED L5 components diverge most from TLI?

Components with |r_diff| < 0.3 (diverge from TLI): 3/5
  - WRESBAL (r=0.2469): Reserve balances
  - WALCL (r=-0.1323): Fed total assets
  - COMPOUT (r=-0.0036): Commercial paper outstanding

Components with |r_diff| >= 0.3 (share dynamics with TLI): 2/5
  - WRMFNS (r=0.4340): Retail money funds
  - TOTBKCR (r=-0.3541): US bank credit

### What is FRED L5 capturing that TLI is not?

The FRED L5 reconstruction combines US-specific monetary metrics:
  - WALCL: Fed balance sheet (US central bank policy)
  - TOTBKCR: US bank credit (US banking sector)
  - WRESBAL: US reserve balances (US monetary base)
  - COMPOUT: US commercial paper (US short-term funding)
  - WRMFNS: US retail money funds (US near-money)

Howell's TLI measures GLOBAL liquidity flows:
  - Multi-currency, cross-border capital flows
  - Includes non-US central banks, sovereign debt cycles
  - Captures Eurodollar funding markets
  - Different aggregation methodology entirely

At cycle scale, these are fundamentally different signals.
FRED L5 ≈ "US monetary policy footprint"
TLI     ≈ "Global liquidity availability"
