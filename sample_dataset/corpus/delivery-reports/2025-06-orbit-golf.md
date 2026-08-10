# Delivery Report: Orbit Golf, 2025-06

Client: Northlight Games. Target network this cycle: Meta. Developers: Ana, Viktor.

## QA findings and fixes
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Ana. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
