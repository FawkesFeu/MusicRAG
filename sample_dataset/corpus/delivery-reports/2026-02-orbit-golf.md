# Delivery Report: Orbit Golf, 2026-02

Client: Northlight Games. Target network this cycle: AppLovin. Developers: Marco, Viktor.

## QA findings and fixes
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.

## Sign-off
Checklist attached to the delivery ticket by Marco. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
