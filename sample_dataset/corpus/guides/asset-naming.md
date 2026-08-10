# Asset Naming Conventions

All assets follow pod_game_asset_variant, lower snake case: nova_bubblebakery_tile_croissant.
Textures carry their target compression in the suffix when it deviates from the default profile.
Audio files live under audio/ and never inside texture folders; the build pipeline's dedicated
audio pass discovers them by path. Misplaced audio is the most common cause of size regressions
flagged at the verify stage.
