# Delivery Report: Cinder Keep, 2025-11

Client: Ferro Games. Target network this cycle: AppLovin. Developers: Petra, Joao.

## QA findings and fixes
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.

## Observations
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Petra. Delivery review run by a developer outside the pod, per the review process. One follow-up ticket opened for the next iteration.
