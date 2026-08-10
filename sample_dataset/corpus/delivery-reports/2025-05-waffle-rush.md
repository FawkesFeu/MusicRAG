# Delivery Report: Waffle Rush, 2025-05

Client: Kumquat Arcade. Target network this cycle: Meta. Developers: Tomas, Dilek.

## QA findings and fixes
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.

## Observations
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Tomas. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
