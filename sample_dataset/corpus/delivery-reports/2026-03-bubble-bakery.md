# Delivery Report: Bubble Bakery, 2026-03

Client: SweetPixel Games. Target network this cycle: Unity. Developers: Ana, Joao.

## QA findings and fixes
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.

## Observations
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Ana. Delivery review run by a developer outside the pod, per the review process. One follow-up ticket opened for the next iteration.
