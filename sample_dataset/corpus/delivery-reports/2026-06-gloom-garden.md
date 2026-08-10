# Delivery Report: Gloom Garden, 2026-06

Client: Grimwood Labs. Target network this cycle: AppLovin. Developers: Tomas, Sofia.

## QA findings and fixes
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Tomas. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
