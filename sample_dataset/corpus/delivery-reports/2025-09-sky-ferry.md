# Delivery Report: Sky Ferry, 2025-09

Client: Pocket Comet. Target network this cycle: Unity. Developers: Joao, Ana.

## QA findings and fixes
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.

## Observations
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.

## Sign-off
Checklist attached to the delivery ticket by Joao. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
