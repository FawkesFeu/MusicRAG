# Delivery Report: Bubble Bakery, 2025-05

Client: SweetPixel Games. Target network this cycle: Unity. Developers: Viktor, Tomas.

## QA findings and fixes
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Viktor. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
