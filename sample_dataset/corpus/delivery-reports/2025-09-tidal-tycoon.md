# Delivery Report: Tidal Tycoon, 2025-09

Client: Tandem Toys. Target network this cycle: AppLovin. Developers: Ana, Deniz.

## QA findings and fixes
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.

## Observations
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Ana. Delivery review run by a developer outside the pod, per the review process. One follow-up ticket opened for the next iteration.
