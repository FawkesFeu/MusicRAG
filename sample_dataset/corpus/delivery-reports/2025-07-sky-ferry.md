# Delivery Report: Sky Ferry, 2025-07

Client: Pocket Comet. Target network this cycle: Unity. Developers: Deniz, Viktor.

## QA findings and fixes
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.

## Observations
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Deniz. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
