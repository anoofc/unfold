import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { narrationClips, narrationVoice } from '../src/narration-clips.js';
import { writeNarrationNotes } from './narration-notes.mjs';

// Neural synthesis runs at authoring time. Only the generated audio is shipped;
// no speech model, Python runtime, service credentials or API calls enter the app.
const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), 'unfold-neural-narration-'));
const generator = 'hyperframes@0.9.26';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const useAfconvert = spawnSync('afconvert', ['-h'], { stdio: 'ignore' }).error === undefined;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const manifest = { generator, voice: narrationVoice, encoding: { codec: 'AAC', sampleRate: 44100, bitrate: 96000 }, clips: [] };
try {
  for (const [lessonId, contexts] of Object.entries(narrationClips)) {
    for (const [contextId, clip] of Object.entries(contexts)) {
      const key = `${lessonId}/${contextId}`;
      const text = join(temporary, `${lessonId}-${contextId}.txt`);
      const wav = join(temporary, `${lessonId}-${contextId}.wav`);
      const m4a = join(temporary, `${lessonId}-${contextId}.m4a`);
      writeFileSync(text, clip.transcript);
      console.log(`Generating ${key} with ${narrationVoice.id}…`);
      const stdout = execFileSync(npx, [
        '--yes', generator, 'tts', '--text-file', text,
        '--voice', narrationVoice.id, '--lang', narrationVoice.language,
        '--speed', String(narrationVoice.speed), '--output', wav, '--json',
      ], { encoding: 'utf8', timeout: 300_000, maxBuffer: 4 * 1024 * 1024 });
      const result = JSON.parse(stdout.trim());
      if (!result.ok || result.voice !== narrationVoice.id || !result.langApplied) {
        throw new Error(`${key}: neural speech generation failed: ${stdout}`);
      }
      const duration = result.durationSeconds;
      const [minimum, maximum] = clip.durationRange;
      if (!Number.isFinite(duration) || duration < minimum || duration > maximum) {
        throw new Error(`${key}: ${duration}s is outside ${minimum}–${maximum}s. Adjust the script or narrationVoice.speed and regenerate.`);
      }
      if (useAfconvert) {
        execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac@44100', '-b', '96000', wav, m4a]);
      } else {
        execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'aac', '-ar', '44100', '-b:a', '96k', '-movflags', '+faststart', m4a]);
      }
      manifest.clips.push({
        lessonId, contextId, src: clip.src, durationSeconds: duration,
        transcriptSha256: sha256(clip.transcript), audioSha256: sha256(readFileSync(m4a)),
      });
      console.log(`Ready ${key}: ${duration.toFixed(2)}s`);
    }
  }
  // Publish only after every clip has been generated and validated. A failed
  // generation leaves the previous complete set untouched.
  for (const clip of manifest.clips) {
    const destination = resolve(root, 'public', clip.src);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(temporary, `${clip.lessonId}-${clip.contextId}.m4a`), destination);
  }
  writeFileSync(resolve(root, 'public/audio/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeNarrationNotes(manifest);
  for (const id of ['assembly', 'piston', 'crank']) {
    rmSync(resolve(root, `public/audio/engine/${id}.m4a`), { force: true });
  }
  console.log(`Published ${manifest.clips.length} neural narration clips.`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
