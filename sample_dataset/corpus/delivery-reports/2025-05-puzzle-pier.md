# Delivery Report: Puzzle Pier, 2025-05

Client: Mistral Play. Target network this cycle: AppLovin. Developers: Ines, Tomas.

## QA findings and fixes
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.

## Observations
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Ines. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
