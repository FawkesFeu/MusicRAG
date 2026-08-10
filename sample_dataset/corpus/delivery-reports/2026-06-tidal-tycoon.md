# Delivery Report: Tidal Tycoon, 2026-06

Client: Tandem Toys. Target network this cycle: AppLovin. Developers: Elif, Tomas.

## QA findings and fixes
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.

## Observations
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Elif. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
