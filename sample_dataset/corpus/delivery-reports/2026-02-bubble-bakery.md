# Delivery Report: Bubble Bakery, 2026-02

Client: SweetPixel Games. Target network this cycle: AppLovin. Developers: Ana, Elif.

## QA findings and fixes
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Ana. Delivery review run by a developer outside the pod, per the review process. One follow-up ticket opened for the next iteration.
