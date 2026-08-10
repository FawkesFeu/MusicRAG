# Delivery Report: Sky Ferry, 2026-04

Client: Pocket Comet. Target network this cycle: Unity. Developers: Viktor, Marco.

## QA findings and fixes
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.

## Observations
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Viktor. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
