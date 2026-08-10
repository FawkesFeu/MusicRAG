# Delivery Report: Gloom Garden, 2025-07

Client: Grimwood Labs. Target network this cycle: AppLovin. Developers: Sofia, Baris.

## QA findings and fixes
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.

## Sign-off
Checklist attached to the delivery ticket by Sofia. Delivery review run by a developer outside the pod, per the review process. No blockers.
