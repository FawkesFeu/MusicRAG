# Delivery Report: Bubble Bakery, 2026-04

Client: SweetPixel Games. Target network this cycle: Meta. Developers: Joao, Ines.

## QA findings and fixes
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- The drone searchlight flickered on speed boosts with motion blur; blend mode corrected.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Joao. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
