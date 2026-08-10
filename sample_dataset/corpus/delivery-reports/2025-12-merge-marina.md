# Delivery Report: Merge Marina, 2025-12

Client: BlueHarbor Interactive. Target network this cycle: AppLovin. Developers: Marco, Sofia.

## QA findings and fixes
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.

## Observations
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Marco. Delivery review run by a developer outside the pod, per the review process. One follow-up ticket opened for the next iteration.
