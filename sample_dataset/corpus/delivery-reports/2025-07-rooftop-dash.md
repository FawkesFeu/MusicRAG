# Delivery Report: Rooftop Dash, 2025-07

Client: Neon Owl Studio. Target network this cycle: AppLovin. Developers: Sofia, Marco.

## QA findings and fixes
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.

## Observations
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Fail-to-retry conversion held above 80 percent across all tested devices.

## Sign-off
Checklist attached to the delivery ticket by Sofia. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
