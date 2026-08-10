# Delivery Report: Gloom Garden, 2026-04

Client: Grimwood Labs. Target network this cycle: Unity. Developers: Baris, Ana.

## QA findings and fixes
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.

## Sign-off
Checklist attached to the delivery ticket by Baris. Delivery review run by a developer outside the pod, per the review process. One follow-up ticket opened for the next iteration.
