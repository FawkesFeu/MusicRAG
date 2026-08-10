# Postmortem: November 2025 Analytics Leak

One AppLovin build was rejected for an outbound request. Root cause: a debug flag left enabled made the analytics buffer flush to the staging endpoint at runtime, bypassing the export-time strip.

Fix: export now hard-fails if any network transport is reachable from the bundle when the target network forbids runtime requests; debug flags are stripped by the export profile rather than by convention.

Lesson: forbidden behavior should be made impossible at build time, not discouraged by convention.
