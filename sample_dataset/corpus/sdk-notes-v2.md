# Lumen SDK v2 (DEPRECATED)

Status: deprecated since January 2026. Do not use for new playables. Kept for maintenance of legacy projects only. See "Lumen SDK v3" for current guidance.

In v2, a playable initializes the SDK by calling lumen.start(config) at the end of the body script. Events are sent with lumen.track(name, payload). The end card is triggered with lumen.endCard().

v2 bundles its own polyfills, which adds roughly 180 KB to every build. This is the main reason v2 was retired.
