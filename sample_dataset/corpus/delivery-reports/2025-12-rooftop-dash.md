# Delivery Report: Rooftop Dash, 2025-12

Client: Neon Owl Studio. Target network this cycle: Meta. Developers: Ana, Sofia.

## QA findings and fixes
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.

## Observations
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Ana. Delivery review run by a developer outside the pod, per the review process. No blockers.
