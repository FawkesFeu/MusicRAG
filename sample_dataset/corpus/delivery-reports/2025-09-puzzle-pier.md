# Delivery Report: Puzzle Pier, 2025-09

Client: Mistral Play. Target network this cycle: AppLovin. Developers: Deniz, Marco.

## QA findings and fixes
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Fail-to-retry conversion held above 80 percent across all tested devices.

## Sign-off
Checklist attached to the delivery ticket by Deniz. Delivery review run by a developer outside the pod, per the review process. No blockers.
