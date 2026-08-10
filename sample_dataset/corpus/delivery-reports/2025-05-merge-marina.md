# Delivery Report: Merge Marina, 2025-05

Client: BlueHarbor Interactive. Target network this cycle: Meta. Developers: Tomas, Marco.

## QA findings and fixes
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Tomas. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
