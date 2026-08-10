# Delivery Report: Tidal Tycoon, 2026-04

Client: Tandem Toys. Target network this cycle: AppLovin. Developers: Ana, Dilek.

## QA findings and fixes
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.

## Sign-off
Checklist attached to the delivery ticket by Ana. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
