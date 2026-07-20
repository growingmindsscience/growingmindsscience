# CDI Exclusion Harness (stub, Matthew-only input)

Purpose: guarantee the GMS Communication Snapshot word list does not reproduce
MacArthur-Bates CDI items. This is an EXCLUSION check only; licensed materials
never inform item selection, only rejection.

Why this file is a stub: the reference list must come from materials Matthew has
legitimate research access to. It must not be generated, reconstructed from
memory, or scraped. Nothing about this harness runs until the reference file
exists locally.

Contract:
- Matthew places `cdi_reference.local.json` here: { "items": ["..."] }.
- The file is gitignored (see .gitignore in this directory) and never leaves
  his machine; CI runs the check only via a hash-committed result attestation
  produced by `pnpm check:cdi` locally, which emits `attestation.json`
  { items_hash, snapshot_items_version, collisions: 0, checked_at }.
- Collision rule: case-insensitive lemma match after stripping parentheticals.
  Any collision on a non-function word fails. Function words and unavoidable
  universals (mama, no, more) are allow-listed with justification comments,
  since no early-vocabulary instrument can exclude them and their presence is
  not distinctive of the CDI.
- The items artifact cannot promote past the review queue without a current
  attestation matching its version.
