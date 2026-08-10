# Delivery Report: Tidal Tycoon, 2025-06

Client: Tandem Toys. Target network this cycle: AppLovin. Developers: Dilek, Viktor.

## QA findings and fixes
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Dilek. Delivery review run by a developer outside the pod, per the review process. One follow-up ticket opened for the next iteration.
