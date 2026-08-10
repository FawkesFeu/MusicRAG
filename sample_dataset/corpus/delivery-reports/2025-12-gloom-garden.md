# Delivery Report: Gloom Garden, 2025-12

Client: Grimwood Labs. Target network this cycle: AppLovin. Developers: Sofia, Ines.

## QA findings and fixes
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.

## Observations
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Sofia. Delivery review run by a developer outside the pod, per the review process. No blockers.
