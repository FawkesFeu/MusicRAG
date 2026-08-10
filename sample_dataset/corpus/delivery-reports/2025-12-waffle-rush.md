# Delivery Report: Waffle Rush, 2025-12

Client: Kumquat Arcade. Target network this cycle: Meta. Developers: Ines, Elif.

## QA findings and fixes
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.

## Observations
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Ines. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
