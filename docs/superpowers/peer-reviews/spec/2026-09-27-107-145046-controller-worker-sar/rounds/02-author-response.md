# SAR Round 2 Author Response

CWSAR-004: addressed. The embedded aggregate now binds current-run inputs using
local observation/receipt IDs, with the enclosing manifest binding metrics.json.
Already sealed predecessors retain explicit input digests. The same rule covers
local amendment observations. A later external derived view can pin every input
digest after all inputs are sealed. Release gate 12 now exercises this boundary.

No finding was rejected or deferred. CWSAR-001 through CWSAR-003 remain resolved.
The next round must review the exact revised bytes before claiming a clean pass.

## Telemetry Availability

Requested identity is gpt-6-astra/high. Exact observed variant and effort,
provider/API duration, token, reasoning, cache and cost measurements remain null
with reasons and source in metrics.json. Local wall duration includes tool and
evidence work. Process termination requires later external observation.
