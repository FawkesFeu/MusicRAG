# Delivery Report: Orbit Golf, 2025-09

Client: Northlight Games. Target network this cycle: Meta. Developers: Ana, Tomas.

## QA findings and fixes
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.

## Observations
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Ana. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
