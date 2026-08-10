# Delivery Report: Waffle Rush, 2026-04

Client: Kumquat Arcade. Target network this cycle: AppLovin. Developers: Ana, Dilek.

## QA findings and fixes
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.

## Observations
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Ana. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
