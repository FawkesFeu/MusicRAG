# Delivery Report: Sky Ferry, 2025-12

Client: Pocket Comet. Target network this cycle: Unity. Developers: Ana, Sofia.

## QA findings and fixes
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Ana. Delivery review run by a developer outside the pod, per the review process. No blockers.
