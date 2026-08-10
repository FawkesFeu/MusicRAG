# Creative Review Process

Every playable passes two internal reviews before client delivery: a design review at the
first playable build, and a delivery review after QA. The delivery review is run by a developer
from a different pod, never the author's own pod. Client-visible builds always come from the
staging CDN; direct file transfers to clients are not allowed.
