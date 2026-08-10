# Delivery Report: Gloom Garden, 2026-05

Client: Grimwood Labs. Target network this cycle: AppLovin. Developers: Viktor, Deniz.

## QA findings and fixes
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Fail-to-retry conversion held above 80 percent across all tested devices.

## Sign-off
Checklist attached to the delivery ticket by Viktor. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
