# Postmortem: July 2025 Localization Regression

Three deliveries shipped with missing Korean glyphs after a font subsetting change trimmed characters used only in the fail-state copy. Internal QA missed it because the checklist glyph check at the time covered Japanese only.

Fix: the glyph coverage check was extended to every language in the minimum set and automated inside lumen-build verify (shipped in 3.8). The QA checklist was updated to reference the automated check instead of a manual pass.

Lesson: manual language checks do not scale past two scripts; automate coverage against the full minimum language set.
