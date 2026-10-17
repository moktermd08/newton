# @gg/ui — copied, do not edit

This folder is a copy of `packages/ui/src` from the GGLeads repo, the GG apps' shared UI kit.
Change the kit there and copy it here with:

    node scripts/sync-ui.mjs ../ggsocial

- from: ggleads `553c0d1`
- hash: `200fd07af03fb35a`

`node scripts/sync-ui.mjs ../ggsocial --check` (run in ggleads) fails if this copy was edited
by hand or has fallen behind.
