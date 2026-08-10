# Delivery Report: Gloom Garden, 2025-06

Client: Grimwood Labs. Target network this cycle: Unity. Developers: Petra, Baris.

## QA findings and fixes
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.

## Sign-off
Checklist attached to the delivery ticket by Petra. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
