# Delivery Report: Sky Ferry, 2026-03

Client: Pocket Comet. Target network this cycle: AppLovin. Developers: Tomas, Baris.

## QA findings and fixes
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Tomas. Delivery review run by a developer outside the pod, per the review process. One follow-up ticket opened for the next iteration.
