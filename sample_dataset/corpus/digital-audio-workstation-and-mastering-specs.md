# Digital Audio Workstation (DAW) & Mastering Technical Specifications

## Overview

Modern music production relies on Digital Audio Workstations (DAWs) such as Ableton Live, Logic Pro, Pro Tools, FL Studio, and Cubase. Submitting masters to digital distributors and streaming platforms requires adherence to standardized audio encoding, loudness targets, sample rates, and bit depths.

## Audio Resolution & Master Export Standards

### Sample Rate & Bit Depth Guidelines
For final master delivery to distributors (DistroKid, TuneCore, Recommended DDEX delivery):
- **Standard Uncompressed Master Format**: Stereo WAV or AIFF
- **Minimum Resolution**: 24-bit / 44.1 kHz
- **High-Resolution Master**: 24-bit / 96 kHz or 24-bit / 192 kHz (Required for Apple Music Lossless / Hi-Res Masters)
- **Avoid MP3 or AAC Exports for Ingestion**: Compressed audio formats should never be uploaded to distributors, as DSPs re-encode files into proprietary codecs (Ogg Vorbis, AAC, Opus). Double-compression degrades audio clarity and causes clipping artifacts.

## Integrated Loudness Targets (LUFS) by Platform

Loudness Units Full Scale (LUFS) measure integrated audio loudness over time. DSPs automatically apply loudness normalization algorithms to equalize playback volume across tracks.

| Platform | Integrated Loudness Target | Peak Limit (True Peak) | Normalization Behavior |
|---|---|---|---|
| Spotify | -14 LUFS | -1.0 dBTP | Normalizes louder tracks down; turns quieter tracks up if limiter is active. |
| Apple Music | -16 LUFS | -1.0 dBTP | Sound Check normalizes tracks down; preserving dynamic range. |
| YouTube Music | -14 LUFS | -1.0 dBTP | Normalizes loud tracks down; never turns quiet tracks up. |
| Tidal | -14 LUFS | -1.0 dBTP | Normalizes loud tracks down. |
| Amazon Music | -14 LUFS | -1.0 dBTP | Normalizes loud tracks down. |

### Mastering Recommendations
1. Target an integrated loudness of **-14 LUFS to -12 LUFS** for pop, electronic, and hip-hop tracks, and **-16 LUFS to -14 LUFS** for acoustic, jazz, and classical recordings.
2. Leave a maximum **True Peak of -1.0 dBTP to -2.0 dBTP** ceiling to prevent inter-sample peak distortion during AAC/Ogg lossy transcoding.

## Stems and Mix Archiving Best Practices

When finalizing project files for remixing, sync placement, or archiving:
- Export uncompressed **Multitrack Stems** (Drums, Bass, Guitars, Synths, Lead Vocals, Backing Vocals, FX) starting from absolute zero (`00:00:00:00`) timecode alignment.
- Always export both **Dry Stems** (without delay/reverb plugins) and **Wet Stems** (with spatial FX enabled).
- Include a 1 kHz reference calibration tone (-20 dBFS) if archiving stems for analog mixing desks or film dubbing stages.
