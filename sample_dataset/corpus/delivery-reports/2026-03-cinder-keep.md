# Delivery Report: Cinder Keep, 2026-03

Client: Ferro Games. Target network this cycle: Meta. Developers: Viktor, Ana.

## QA findings and fixes
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.

## Observations
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Viktor. Delivery review run by a developer outside the pod, per the review process. No blockers.
