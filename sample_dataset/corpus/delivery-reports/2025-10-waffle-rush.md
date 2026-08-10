# Delivery Report: Waffle Rush, 2025-10

Client: Kumquat Arcade. Target network this cycle: Unity. Developers: Sofia, Elif.

## QA findings and fixes
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Sofia. Delivery review run by a developer outside the pod, per the review process. One follow-up ticket opened for the next iteration.
