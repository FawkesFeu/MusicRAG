# Delivery Report: Merge Marina, 2026-05

Client: BlueHarbor Interactive. Target network this cycle: Meta. Developers: Petra, Baris.

## QA findings and fixes
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.

## Observations
- Cta_click over end_card_shown moved from 7.9 to 9.3 percent after the cta copy change.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Loop_complete rate rose once the second tutorial hint was made skippable.

## Sign-off
Checklist attached to the delivery ticket by Petra. Delivery review run by a developer outside the pod, per the review process. Client requested a minor copy change, delivered same day.
