# Delivery Report: Merge Marina, 2026-01

Client: BlueHarbor Interactive. Target network this cycle: AppLovin. Developers: Tomas, Elif.

## QA findings and fixes
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.

## Observations
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Tomas. Delivery review run by a developer outside the pod, per the review process. No blockers.
