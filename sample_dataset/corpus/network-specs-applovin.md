# Network Specs: AppLovin

AppLovin playables at Lumen ship as a single self-contained HTML file. All assets are inlined (base64) and no external network requests are allowed at runtime.

Hard limits:
- Maximum file size: 5 MB for the final single HTML file.
- Orientation: must support both portrait and landscape.
- The end card CTA must call the MRAID open handler; deep links are not permitted.

The AppLovin QA bot rejects builds that make any outbound request, including analytics beacons. Lumen strips all analytics from AppLovin builds at export time; events are replayed from a local buffer during internal testing only.
