# Delivery Report: Bubble Bakery, 2025-12

Client: SweetPixel Games. Target network this cycle: Unity. Developers: Baris, Dilek.

## QA findings and fixes
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.

## Observations
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Baris. Delivery review run by a developer outside the pod, per the review process. One follow-up ticket opened for the next iteration.
