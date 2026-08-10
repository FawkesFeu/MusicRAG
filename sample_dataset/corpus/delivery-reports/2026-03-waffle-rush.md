# Delivery Report: Waffle Rush, 2026-03

Client: Kumquat Arcade. Target network this cycle: Unity. Developers: Sofia, Marco.

## QA findings and fixes
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Sofia. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
