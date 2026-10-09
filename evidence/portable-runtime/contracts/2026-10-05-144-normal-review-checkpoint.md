# Normal review source-verification checkpoint — #144

The document checker now exposes normal collateral validation separately from private event replay. Complete actual 0.4.1 manifests use a checker-owned copy of that producer's exact runtime schema; unknown profiles refuse and the historical 0.4.0 profile still refuses the actual author fields. Public runtime/schema source remains unchanged. Strict nested schema checks retain the complete normal manifest and terminal coherence.

The shared collateral seam verifies exact subject/manifest/accepted-member Git bytes, distinct registered identity fingerprints, unchanged authority assurance, accepted normal decision, response metadata, manifest lineage receipt shape, finalization trailers, parent and committed member bytes. It explicitly reports private event replay as not checked; it supplies no standalone adoption or persisted journal authority.

Genuine RED: `.scratch/144/grammar-manifest-corrected-red.stdout.txt` and `normal-collateral-red.stdout.txt`. The initial manifest test used an incorrect generated filename; the ENOENT receipt `grammar-manifest-red.*` is preserved as a setup error, not feature RED. Final GREEN: `.scratch/144/normal-collateral-green.stdout.txt`, 112 affected checks. Actual normal design/owner/companion collateral each passes this seam with unavailable assurance; exact public refs and diagnostics are retained in `.scratch/144/authentic-normal-review-references.json`.

The retained public proof generator/schema, review of immutable contract evidence, canonical Plan repeat acceptance/native mapping, exact-head CI and native Test remain pending. These preparation checks do not satisfy #144 acceptance or any operational publication gate.
