# Delivery Report: Merge Marina, 2025-11

Client: BlueHarbor Interactive. Target network this cycle: AppLovin. Developers: Deniz, Baris.

## QA findings and fixes
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.

## Observations
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Deniz. Delivery review run by a developer outside the pod, per the review process. No blockers.
