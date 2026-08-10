# Delivery Report: Waffle Rush, 2025-11

Client: Kumquat Arcade. Target network this cycle: Meta. Developers: Petra, Deniz.

## QA findings and fixes
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.

## Observations
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Fail-to-retry conversion held above 80 percent across all tested devices.

## Sign-off
Checklist attached to the delivery ticket by Petra. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
