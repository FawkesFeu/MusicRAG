# Delivery Report: Bubble Bakery, 2025-07

Client: SweetPixel Games. Target network this cycle: AppLovin. Developers: Ines, Tomas.

## QA findings and fixes
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Fail-to-retry conversion held above 80 percent across all tested devices.

## Sign-off
Checklist attached to the delivery ticket by Ines. Delivery review run by a developer outside the pod, per the review process. No blockers.
