# Delivery Report: Sky Ferry, 2025-06

Client: Pocket Comet. Target network this cycle: Unity. Developers: Deniz, Dilek.

## QA findings and fixes
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Deniz. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
