# Analytics Event Taxonomy

Lumen playables emit a fixed event set so client reports are comparable across projects:

- load_complete: fired when assets are ready and the first frame is rendered.
- first_interaction: the first tap, swipe or drag. The time from load_complete to first_interaction is the primary engagement metric.
- loop_complete: one full pass of the core loop.
- fail_state and retry: fired on lose conditions and on retries.
- end_card_shown and cta_click: the funnel tail. cta_click divided by end_card_shown is the reported CTR.

Custom events are allowed with the client_ prefix only. Events are buffered locally and, for networks that forbid runtime requests, never leave the device (see AppLovin spec).
