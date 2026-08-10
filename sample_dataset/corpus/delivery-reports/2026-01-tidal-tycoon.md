# Delivery Report: Tidal Tycoon, 2026-01

Client: Tandem Toys. Target network this cycle: Unity. Developers: Dilek, Baris.

## QA findings and fixes
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.

## Sign-off
Checklist attached to the delivery ticket by Dilek. Delivery review run by a developer outside the pod, per the review process. No blockers.
