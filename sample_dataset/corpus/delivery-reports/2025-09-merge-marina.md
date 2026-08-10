# Delivery Report: Merge Marina, 2025-09

Client: BlueHarbor Interactive. Target network this cycle: Meta. Developers: Ana, Marco.

## QA findings and fixes
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Ana. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
