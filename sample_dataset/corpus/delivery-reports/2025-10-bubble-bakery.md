# Delivery Report: Bubble Bakery, 2025-10

Client: SweetPixel Games. Target network this cycle: Unity. Developers: Viktor, Baris.

## QA findings and fixes
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.

## Observations
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Viktor. Delivery review run by a developer outside the pod, per the review process. One follow-up ticket opened for the next iteration.
