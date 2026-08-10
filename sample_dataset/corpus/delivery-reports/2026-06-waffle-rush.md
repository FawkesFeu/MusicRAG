# Delivery Report: Waffle Rush, 2026-06

Client: Kumquat Arcade. Target network this cycle: AppLovin. Developers: Marco, Sofia.

## QA findings and fixes
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Orientation switch during the fail popup misplaced the retry button; layout re-anchored.

## Observations
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Fail-to-retry conversion held above 80 percent across all tested devices.

## Sign-off
Checklist attached to the delivery ticket by Marco. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
