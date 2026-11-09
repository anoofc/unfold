# Narration for all Unfold lessons

All four lessons have an assembly overview and a separate explanation for every selectable part: **26 recordings** in total.

| Lesson | Overview | Parts | Total |
| --- | --- | --- | --- |
| Engine | 1 | 8 | 9 |
| Earth | 1 | 4 | 5 |
| Telephone | 1 | 5 | 6 |
| Human body | 1 | 5 | 6 |

## Voice and delivery

Every clip uses **Kokoro-82M v1.0, Heart (`af_heart`), American English**, at a speed multiplier of 0.93. This is a neural speech model with learned vocal expression, replacing the original macOS Samantha recordings. It is not an OpenAI/ChatGPT voice. No OpenAI credentials are configured in this project.

The scripts use short sentences, conversational phrasing and simple English for children. Overview targets are 20–35 seconds, and part explanations target 10–20 seconds. Audio and the visible transcripts come from the same source in `src/narration-clips.js`. Review the scripts and actual generated durations in [NARRATION_SCRIPTS.md](NARRATION_SCRIPTS.md).

Files are AAC in M4A containers, encoded as mono at 44.1 kHz and 96 kbit/s. The synthesis model produces 24 kHz source audio; conversion resamples it for AAC compatibility. Files are stored locally under `public/audio/<lesson>/`. Versioned `-heart-v1.m4a` filenames prevent the old voice from being reused from browser cache.

The application loads a recording only when narration is enabled and playback is requested. It never downloads a speech model or calls a speech-generation API during a lesson. The UI labels the recordings as AI narration.

## Playback

- First visit offers Start with audio and Explore silently. The browser remembers the choice under `unfold:narration-enabled`; unavailable storage falls back to a session-only choice.
- With audio enabled, opening a lesson attempts its overview. If autoplay is blocked, Play offers recovery.
- Model clicks, the part list and the part arrows all use the existing selection handler, which maps lesson/part IDs to a clip.
- Every selection stops the previous source and starts the new clip from the beginning. One shared player and request versions prevent overlap and stale play promises.
- Returning to assembly stops the part clip and makes the overview available without autoplay. Replay starts it from the beginning.
- Missing clips or failed recordings keep the text and model usable. All currently selectable parts have recordings; the missing-clip behavior remains available for future additions.
- Play/Pause and Replay operate on narration only. Mute stops narration and saves silence; Unmute enables narration and starts the current view's clip.
- Leaving the lesson or document stops playback. Narration controls are inside the model stage, so they also remain available in model fullscreen. The transcript can be collapsed.

## Regenerate recordings

Running and building the app only require its existing Node dependencies. These extra tools are needed **only to regenerate** audio:

- Python 3.10+; Python 3.12 is recommended.
- The packages in `scripts/narration-requirements.txt`.
- The pinned HyperFrames CLI, automatically invoked with `npx hyperframes@0.9.26`.
- `afconvert` on macOS, or FFmpeg on other platforms.

Example for macOS/Linux with Python 3.12 installed:

```sh
python3.12 -m venv .venv-narration
.venv-narration/bin/python -m pip install -r scripts/narration-requirements.txt
HYPERFRAMES_PYTHON="$PWD/.venv-narration/bin/python" npm run narration:generate
```

The first generation downloads Kokoro's model and voice data into HyperFrames' external cache (roughly 338 MB). They are not bundled with the app. Later generations reuse that cache. The generator never falls back to the system voice.

Generation stages every recording in a temporary directory and validates duration limits before publishing the full set. It also writes `public/audio/manifest.json`, recording the shared model/voice settings, clip IDs, duration and SHA-256 hashes of each transcript and recording. This lets tests catch missing coverage or a script changed without regenerating its audio. The three old system-voice files are removed only after a successful full generation.

To change the voice or scripts, edit `src/narration-clips.js`, increment the voice revision for a voice change, and regenerate. The manifest mapping uses existing IDs, including `crank` for crankshaft and `assembly` for overviews. Playback logic requires no lesson-specific changes.

Model and tool references:

- [Kokoro model and voice information](https://huggingface.co/hexgrad/Kokoro-82M) — Apache 2.0 model weights.
- [Kokoro ONNX implementation](https://github.com/thewh1teagle/kokoro-onnx) — MIT implementation.
- [HyperFrames](https://www.npmjs.com/package/hyperframes) — speech-generation CLI.

## Verification and browser checklist

`npm test` checks first-visit choice, remembered silence, pause/resume, Replay, mute, rapid selections, stale promise handling, missing/blocked audio recovery, every lesson/part mapping, encoded durations and recording/transcript provenance. `npm run build` packages the complete set.

Verification completed: all **18 automated tests** pass and the production build passes with the existing viewer bundle-size warning. All 26 M4A files decode to non-silent audio without full-scale clipping, and the production preview serves every recording intact with the correct audio MIME type and byte-range support. The old system-voice files are absent.

No browser is connected in this session. Automated media-controller checks use a simulated audio element and do not verify audible quality, browser autoplay policy or actual 3D clicks. Run these manual checks with `npm run dev`:

- [ ] In a fresh browser profile, open any lesson. No narration plays before choosing Start with audio or Explore silently.
- [ ] Start with audio plays the correct overview and shows its transcript. Explore silently remains quiet after reload. Mute/Unmute can change this choice at any time.
- [ ] In each lesson, select every part using the part list, direct model clicks where visible, and the part arrows. The correct explanation starts at the beginning and the transcript matches.
- [ ] Switch rapidly between parts and lessons. Only the latest clip plays; the previous clip never resumes after a delayed load.
- [ ] Tap empty space after the zoom finishes, and also use Back to assembly. Both stop part narration; Replay starts the overview without needing to leave the lesson.
- [ ] Pause narration while the assembly animation runs. Pause animation while narration plays. Neither control changes the other.
- [ ] Return to the catalog or leave the site while audio plays. Playback stops. Reopening a lesson uses the remembered preference.
- [ ] Test orbit, wheel/pinch zoom, smooth isolation/return, and both fullscreen buttons. Check narration controls and transcript at mobile widths too.
- [ ] Block autoplay and verify Play recovers. Block a recording URL, verify the transcript/model still work, unblock it and use Replay.
- [ ] Listen to every clip for naturalness, consistent voice, pace, scientific terms and agreement with its transcript.
