# Delivery Report: Orbit Golf, 2025-11

Client: Northlight Games. Target network this cycle: Unity. Developers: Marco, Petra.

## QA findings and fixes
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.

## Observations
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Marco. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
