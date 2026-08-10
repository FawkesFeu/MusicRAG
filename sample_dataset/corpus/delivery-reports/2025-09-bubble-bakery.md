# Delivery Report: Bubble Bakery, 2025-09

Client: SweetPixel Games. Target network this cycle: AppLovin. Developers: Deniz, Ines.

## QA findings and fixes
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Deniz. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
