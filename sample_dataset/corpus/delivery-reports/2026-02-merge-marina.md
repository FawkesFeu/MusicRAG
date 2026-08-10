# Delivery Report: Merge Marina, 2026-02

Client: BlueHarbor Interactive. Target network this cycle: Meta. Developers: Ana, Petra.

## QA findings and fixes
- Haptics fired on every match on ios which the client found excessive; reduced to combos.
- Retry after fail state occasionally skipped the tutorial hint; state machine reset fixed.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Memory grew slightly after repeated loops due to retained particle pools; pools now recycled.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Loop_complete rate rose once the second tutorial hint was made skippable.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.

## Sign-off
Checklist attached to the delivery ticket by Ana. Delivery review run by a developer outside the pod, per the review process. No blockers.
