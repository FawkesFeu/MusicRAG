# Delivery Report: Merge Marina, 2025-10

Client: BlueHarbor Interactive. Target network this cycle: AppLovin. Developers: Petra, Tomas.

## QA findings and fixes
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Petra. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
