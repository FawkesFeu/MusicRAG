# Pre-Delivery QA Checklist

Run before every client delivery, no exceptions:

1. Size check per target network (see network spec docs).
2. First interaction reachable within 3 seconds.
3. No outbound requests in AppLovin builds; analytics stripped.
4. Orientation switch mid-session does not break layout.
5. Localization: all minimum languages render, fallback to English works, no missing glyphs.
6. End card CTA fires the correct network handler.
7. Sound: mute state respected, no audio autoplay before first interaction.
8. Memory: no growth after three full loops of the playable.

A delivery is blocked if any item fails. The checklist result is attached to the delivery ticket by the pod developer.
