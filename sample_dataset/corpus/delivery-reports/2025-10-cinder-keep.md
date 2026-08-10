# Delivery Report: Cinder Keep, 2025-10

Client: Ferro Games. Target network this cycle: Meta. Developers: Dilek, Joao.

## QA findings and fixes
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.

## Sign-off
Checklist attached to the delivery ticket by Dilek. Delivery review run by a developer outside the pod, per the review process. No blockers.
