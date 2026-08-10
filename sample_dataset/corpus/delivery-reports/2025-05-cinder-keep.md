# Delivery Report: Cinder Keep, 2025-05

Client: Ferro Games. Target network this cycle: Unity. Developers: Elif, Marco.

## QA findings and fixes
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.

## Observations
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Elif. Delivery review run by a developer outside the pod, per the review process. No blockers.
