# Delivery Report: Waffle Rush, 2026-01

Client: Kumquat Arcade. Target network this cycle: AppLovin. Developers: Petra, Dilek.

## QA findings and fixes
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.

## Observations
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.

## Sign-off
Checklist attached to the delivery ticket by Petra. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
