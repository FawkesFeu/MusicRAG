# Music Distribution and Metadata Standards Guide

## Overview

Digital music distributors ingest sound recordings and deliver them alongside structured metadata to global streaming services (Spotify, Apple Music, Deezer) via standardized XML/DDEX feeds. Accurately formatted metadata ensures proper royalty routing and search discoverability.

## Unique Identifier Codes: ISRC, ISWC, and UPC/EAN

Accurate identifier codes are essential for track indexing, royalty collection, and digital rights registration:

### 1. ISRC (International Standard Recording Code)
- Identifies specific **sound recordings** and music video recordings.
- Format: `CC-XXX-YY-NNNNN` (12 alphanumeric characters)
  - `CC`: Two-character ISO Country Code (e.g., `US`)
  - `XXX`: Three-character Registrant Code (e.g., `QZ2`)
  - `YY`: Two-digit Year of Reference (e.g., `26` for 2026)
  - `NNNNN`: Five-digit Designation Code (e.g., `00001`)
- Example: `USQZ22600001`

### 2. ISWC (International Standard Musical Work Code)
- Identifies the underlying **musical composition** (lyrics and musical work).
- Format: `T-000000000-C` (10 digits plus a check digit)
- Managed by CISAC and assigned by PROs upon work registration.

### 3. UPC / EAN (Universal Product Code / European Article Number)
- Identifies the digital **album, EP, or single product bundle** as a commercial package.
- 12-digit (UPC) or 13-digit (EAN) barcode number assigned by distributors.

## Mandatory Metadata Fields for Distribution Ingestion

When submitting a release via DDEX or distributor upload forms, the following fields must be populated:

```
+-----------------------------------------------------------------------+
|                       Mandatory Release Metadata                      |
+--------------------------+--------------------------------------------+
| Track Title              | Exact title; no generic terms like "Track 1"|
| Primary Artist(s)        | Spotify Artist ID / Apple Music Artist ID  |
| Featured Artist(s)       | Tagged explicitly; not in track title text  |
| Composer / Songwriter    | Full Legal Names (First & Last Name required) |
| Producer(s)              | Full legal or professional credit names    |
| Genre / Sub-Genre        | Standardized taxonomy (e.g. Alternative R&B)|
| Release Date             | Minimum 14 days lead time for DSP pitch    |
| Explicit Content Warning | True / False indicator                     |
| Audio File Checksum      | SHA-256 validation of uploaded WAV file    |
+--------------------------+--------------------------------------------+
```

## Formatting Rules and Style Guides

Streaming services enforce strict style guidelines to maintain catalog consistency:
- **No Extra Marketing Text**: Titles containing terms like "[New Single]", "[Prod. by Beats]", or "Out Now!" will be automatically rejected.
- **Remix & Version Formatting**: Remixes must be formatted using parenthesis or brackets: *Track Name (Artist Remix)*.
- **Cover Art Requirements**:
  - Min 3000 x 3000 pixels (1:1 perfect square aspect ratio)
  - RGB Color Mode, 72 or 300 DPI, JPEG or PNG format
  - No social media tags, website URLs, pricing info, or low-resolution pixelated artwork.
