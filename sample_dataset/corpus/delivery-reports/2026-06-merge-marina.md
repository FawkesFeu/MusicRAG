# Delivery Report: Merge Marina, 2026-06

Client: BlueHarbor Interactive. Target network this cycle: Unity. Developers: Ines, Elif.

## QA findings and fixes
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.

## Observations
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Ines. Delivery review run by a developer outside the pod, per the review process. One follow-up ticket opened for the next iteration.
