# Delivery Report: Tidal Tycoon, 2026-05

Client: Tandem Toys. Target network this cycle: AppLovin. Developers: Elif, Ana.

## QA findings and fixes
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Coin counter overlapped the notch in landscape on tall screens; safe-area padding added.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.

## Observations
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.

## Sign-off
Checklist attached to the delivery ticket by Elif. Delivery review run by a developer outside the pod, per the review process. No blockers.
