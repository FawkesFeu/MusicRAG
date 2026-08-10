# Delivery Report: Bubble Bakery, 2026-05

Client: SweetPixel Games. Target network this cycle: Unity. Developers: Ines, Marco.

## QA findings and fixes
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.

## Observations
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.

## Sign-off
Checklist attached to the delivery ticket by Ines. Delivery review run by a developer outside the pod, per the review process. One follow-up ticket opened for the next iteration.
