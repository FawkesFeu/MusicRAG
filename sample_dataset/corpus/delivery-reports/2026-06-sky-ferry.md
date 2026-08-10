# Delivery Report: Sky Ferry, 2026-06

Client: Pocket Comet. Target network this cycle: AppLovin. Developers: Baris, Marco.

## QA findings and fixes
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Baris. Delivery review run by a developer outside the pod, per the review process. No blockers.
