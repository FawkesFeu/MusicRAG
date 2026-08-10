# Delivery Report: Orbit Golf, 2025-07

Client: Northlight Games. Target network this cycle: Meta. Developers: Viktor, Dilek.

## QA findings and fixes
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.

## Observations
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.

## Sign-off
Checklist attached to the delivery ticket by Viktor. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
