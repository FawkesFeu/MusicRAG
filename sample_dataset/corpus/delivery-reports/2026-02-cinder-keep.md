# Delivery Report: Cinder Keep, 2026-02

Client: Ferro Games. Target network this cycle: Unity. Developers: Tomas, Ana.

## QA findings and fixes
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Tomas. Delivery review run by a developer outside the pod, per the review process. One follow-up ticket opened for the next iteration.
