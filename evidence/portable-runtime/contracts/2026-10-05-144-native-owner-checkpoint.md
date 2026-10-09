# Native owner-proof checker checkpoint — #144

The document-only checker now requires a separate bounded owner transaction for each of #102/#30/#34/#109. It validates the closed public-facts receipt, exact published comment bytes and IDs, accepted bounded Plan pins, preserved ordinary authority and the exact accepted owner subsection. Reusing the common Plan review cannot replace the native transaction. Exact source bytes include the native marker; adding a terminal newline changes the authoritative digest and refuses.

Genuine RED: `.scratch/144/owner-native-red.stdout.txt`. GREEN: `.scratch/144/owner-native-green.stdout.txt`, 81 affected checks (78 unit, 3 offline Git integration). Synthetic fixture positives exercise grammar only and grant no adoption. Actual #30/#34 native source packets were inspected; authoritative retained owner records and independent contract-record review remain pending.

Full host suites were not run under the user's affected/TIA-only direction. Publication remains denied pending Task18-owned activation schema/conformance and the separate review-proof work. No owner broader Plan or implementation acceptance is claimed.
