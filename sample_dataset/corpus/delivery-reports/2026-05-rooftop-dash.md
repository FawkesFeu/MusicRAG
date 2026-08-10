# Delivery Report: Rooftop Dash, 2026-05

Client: Neon Owl Studio. Target network this cycle: Unity. Developers: Ana, Joao.

## QA findings and fixes
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.

## Observations
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Ana. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
