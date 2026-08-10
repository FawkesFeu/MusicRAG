# lumen-build 4.2 (2026-03-30)

    - Reverted the unified compression path: audio returns to its dedicated pass. See the March 2026 postmortem.
- Verify stage now measures the final inlined artifact instead of the pre-inline bundle.
- Stage order pinned in CI; regression suite builds the three heaviest historical playables on every pipeline change.
