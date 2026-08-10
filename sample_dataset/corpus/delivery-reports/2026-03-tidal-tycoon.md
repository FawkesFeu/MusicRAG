# Delivery Report: Tidal Tycoon, 2026-03

Client: Tandem Toys. Target network this cycle: Unity. Developers: Dilek, Ines.

## QA findings and fixes
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.

## Observations
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Fail-to-retry conversion held above 80 percent across all tested devices.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Dilek. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
