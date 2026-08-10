# Delivery Report: Tidal Tycoon, 2025-07

Client: Tandem Toys. Target network this cycle: Meta. Developers: Joao, Ana.

## QA findings and fixes
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.

## Observations
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Joao. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
