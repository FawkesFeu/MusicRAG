# Delivery Report: Rooftop Dash, 2026-03

Client: Neon Owl Studio. Target network this cycle: Unity. Developers: Deniz, Marco.

## QA findings and fixes
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.

## Observations
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Deniz. Delivery review run by a developer outside the pod, per the review process. No blockers.
