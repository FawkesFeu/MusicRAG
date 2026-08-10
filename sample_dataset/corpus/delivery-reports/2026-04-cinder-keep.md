# Delivery Report: Cinder Keep, 2026-04

Client: Ferro Games. Target network this cycle: AppLovin. Developers: Elif, Baris.

## QA findings and fixes
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Elif. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
