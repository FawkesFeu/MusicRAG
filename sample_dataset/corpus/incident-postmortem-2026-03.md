# Postmortem: March 2026 Delivery Incident

In March 2026 (fictional), eleven AppLovin deliveries were rejected in one week for exceeding the 5 MB single-file limit, despite passing the internal verify stage.

Root cause: a lumen-build update changed the order of the compress and inline stages, so audio was compressed together with textures instead of in its dedicated pass. Audio-heavy playables gained 0.4 to 1.1 MB, pushing them over the limit only on the network side because the internal size check ran before inlining.

Fixes shipped: the verify stage now measures the final inlined artifact, stage order is pinned in CI, and a regression test builds the three heaviest historical playables on every pipeline change.

Lesson: size checks are only meaningful on the exact artifact the network receives.
