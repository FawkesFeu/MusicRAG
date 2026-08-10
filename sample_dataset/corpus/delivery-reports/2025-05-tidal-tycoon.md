# Delivery Report: Tidal Tycoon, 2025-05

Client: Tandem Toys. Target network this cycle: AppLovin. Developers: Elif, Ana.

## QA findings and fixes
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Elif. Delivery review run by a developer outside the pod, per the review process. No blockers.
