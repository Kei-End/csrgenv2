# ECC CSR Assistant & CSR Decoder

This package is reworked as a **hybrid Cloudflare-ready build** with a **static-first** deployment approach.

## Current focus
- Cloudflare Pages friendly
- Browser-side CSR decoding
- Static modular JavaScript layout
- No active server-side functions yet

## Hybrid-ready path
The repository already reserves a `functions/` path for future Cloudflare Pages Functions, but the current build is intentionally focused on static delivery first.

## Deploy shape
- Static root files at repository root
- `wrangler.toml` uses `pages_build_output_dir = "."`
- No build step required for the current browser-side version

## Future evolution
Safe future hybrid additions could include:
- hostname lookup helpers
- report templating
- advisory feeds
- non-sensitive metadata checks

The CSR decode path should remain local unless you deliberately want server-side parsing.
