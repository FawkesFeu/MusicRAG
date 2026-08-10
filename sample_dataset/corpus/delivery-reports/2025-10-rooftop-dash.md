# Delivery Report: Rooftop Dash, 2025-10

Client: Neon Owl Studio. Target network this cycle: Unity. Developers: Tomas, Baris.

## QA findings and fixes
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.

## Observations
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Tomas. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
