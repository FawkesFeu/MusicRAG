# Sample Questions

Example queries for testing your retrieval and answers. A good answer cites the listed documents. Our evaluation uses these plus a private set in the same style.

1. What is the maximum file size for an AppLovin playable, and how does it ship?
   Expect: network-specs-applovin.md

2. How do I initialize the current Lumen SDK, and what happened to lumen.track?
   Expect: sdk-notes-v3.md (sdk-notes-v2.md is deprecated; a good answer says so)

3. Why are sound assets built in a separate pass?
   Expect: build-pipeline.md (incident-postmortem-2026-03.md adds useful context)

4. What caused the March 2026 AppLovin rejections and what was fixed?
   Expect: incident-postmortem-2026-03.md

5. Which languages must every playable ship with, and what is the fallback?
   Expect: localization-guide.md

Also test at least one question the corpus cannot answer (for example a question about salaries or vacation policy). The correct behavior is an honest "the corpus does not cover this", with no invented citation.
