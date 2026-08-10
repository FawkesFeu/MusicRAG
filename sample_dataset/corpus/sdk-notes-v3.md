# Lumen SDK v3 (current)

v3 is the current SDK for all new playables, mandatory since January 2026. It supersedes v2 and is not backward compatible.

Initialization: call LumenSDK.init(config) before any game code runs; init returns a promise that resolves when the network wrapper is ready. Do not start the render loop before it resolves.

Events: LumenSDK.event(name, payload). The old lumen.track calls from v2 are not recognized and fail silently, which is a common migration bug.

End card: LumenSDK.finish({ cta }) replaces lumen.endCard(). The polyfill bundle was removed in v3; builds target evergreen webviews only, saving about 180 KB per build.
