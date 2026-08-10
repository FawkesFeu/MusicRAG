# Delivery Report: Rooftop Dash, 2026-01

Client: Neon Owl Studio. Target network this cycle: Meta. Developers: Sofia, Baris.

## QA findings and fixes
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Sofia. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
