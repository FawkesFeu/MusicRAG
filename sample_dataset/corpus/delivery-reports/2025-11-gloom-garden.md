# Delivery Report: Gloom Garden, 2025-11

Client: Grimwood Labs. Target network this cycle: Meta. Developers: Marco, Dilek.

## QA findings and fixes
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.

## Observations
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Marco. Delivery review run by a developer outside the pod, per the review process. No blockers.
