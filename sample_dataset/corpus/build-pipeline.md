# Build Pipeline

Lumen builds run through the internal CLI, lumen-build, maintained by the Platform team.

The pipeline has four stages: bundle, compress, inline, verify. The verify stage runs the same checks as network QA bots (size, forbidden requests, orientation) so failures surface before delivery.

Sound assets are built separately from the main bundle. Audio is encoded in a dedicated pass and injected at the inline stage, because compressing audio together with textures produced nondeterministic size spikes and broke the AppLovin 5 MB limit on roughly one build in ten. If you see a size regression, check the audio pass first.

Exports are per network: lumen-build export --network applovin produces the single-file build, while --network unity produces the ZIP layout.
