# Network Specs: Unity and Meta

Unity playables ship as a ZIP archive with an index.html entry point. The archive limit is 5 MB, and up to 10 MB after unzip. Unity requires the mraid.js reference to stay in the head of the document.

Meta (Facebook) playables are stricter: a single HTML file with a 2 MB limit, load time under 5 seconds on a mid-range device, and a mandatory visible "sponsored" label handled by the network wrapper. Meta rejects any playable that locks interaction for more than 4 seconds.

When one concept targets several networks, the Platform team exports per-network builds from the same source; teams never hand-edit exported files.
