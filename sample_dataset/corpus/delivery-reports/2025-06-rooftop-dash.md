# Delivery Report: Rooftop Dash, 2025-06

Client: Neon Owl Studio. Target network this cycle: Meta. Developers: Viktor, Joao.

## QA findings and fixes
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.

## Observations
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Viktor. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
