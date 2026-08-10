# Delivery Report: Cinder Keep, 2026-06

Client: Ferro Games. Target network this cycle: Unity. Developers: Deniz, Ana.

## QA findings and fixes
- Korean line breaks split mid-word on the end card; locale-aware wrapping enabled.
- First_interaction arrived late on low-end android; the intro animation was trimmed by 400 ms.
- Mute toggle did not persist across loops; audio state moved out of the loop scope.
- Cta contrast fell below 4.5:1 on the client's light background; standard dark scrim applied.

## Observations
- Size headroom on the applovin export is under 300 kb; audio changes need platform review.
- Time to first interaction improved from 3.4 s to 2.6 s after asset preloading changes.
- Fail-to-retry conversion held above 80 percent across all tested devices.

## Sign-off
Checklist attached to the delivery ticket by Deniz. Delivery review run by a developer outside the pod, per the review process. Export re-run after a size warning; final artifact within limits.
