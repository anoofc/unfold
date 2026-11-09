import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createNarrationPlayer, AUDIO_PREFERENCE_KEY } from '../src/narration.js';
import { narrationClips, narrationVoice } from '../src/narration-clips.js';
import { lessons } from '../src/lessons.js';

class FakeAudio extends EventTarget {
  constructor() {
    super();
    this.src = '';
    this.currentSrc = '';
    this.currentTime = 0;
    this.paused = true;
    this.ended = false;
    this.error = null;
    this.calls = [];
    this.pending = [];
    this.defer = false;
    this.rejection = null;
  }
  pause() { this.paused = true; }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  load() {
    this.currentSrc = this.src;
    this.currentTime = 0;
    this.ended = false;
    this.error = null;
  }
  play() {
    this.calls.push({ src: this.src, time: this.currentTime });
    if (this.rejection) return Promise.reject(this.rejection);
    this.paused = false;
    if (this.defer) return new Promise((resolve, reject) => this.pending.push({ resolve, reject }));
    return Promise.resolve();
  }
}

function storageWith(value) {
  const values = new Map(value === undefined ? [] : [[AUDIO_PREFERENCE_KEY, String(value)]]);
  return { getItem: key => values.get(key) ?? null, setItem: (key, item) => values.set(key, item) };
}

function setup(saved, options = {}) {
  const audio = new FakeAudio();
  const storage = storageWith(saved);
  const player = createNarrationPlayer({ audio, storage, ...options });
  return { audio, storage, player };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('first visit stays quiet until Start with audio starts the assembly', async () => {
  const { audio, storage, player } = setup();
  player.setContext('engine');
  assert.equal(player.getState().enabled, null);
  assert.equal(audio.calls.length, 0);
  player.setEnabled(true);
  await settle();
  assert.deepEqual(audio.calls, [{ src: '/audio/engine/assembly-heart-v1.m4a', time: 0 }]);
  assert.equal(player.getState().status, 'playing');
  assert.equal(storage.getItem(AUDIO_PREFERENCE_KEY), 'true');
});

test('Explore silently is remembered across a new player/reload and can be changed', async () => {
  const { storage, player } = setup();
  player.setContext('engine');
  player.setEnabled(false);
  const audio = new FakeAudio();
  const reloaded = createNarrationPlayer({ audio, storage });
  reloaded.setContext('engine');
  reloaded.setContext('engine', 'piston');
  assert.equal(reloaded.getState().enabled, false);
  assert.equal(audio.calls.length, 0);
  assert.equal(audio.muted, true);
  reloaded.setEnabled(true);
  await settle();
  assert.equal(audio.muted, false);
  assert.equal(audio.calls.at(-1).src, '/audio/engine/piston-heart-v1.m4a');
});

test('a remembered audio choice plays the overview when the lesson opens', async () => {
  const { audio, player } = setup(true);
  player.setContext('engine');
  await settle();
  assert.equal(audio.calls[0].src, '/audio/engine/assembly-heart-v1.m4a');
  assert.equal(player.getState().status, 'playing');
});

test('narrated selections restart at zero; rapid switches ignore stale play promises', async () => {
  const { audio, player } = setup(true);
  audio.defer = true;
  player.setContext('engine');
  audio.currentTime = 4;
  player.setContext('engine', 'piston');
  audio.currentTime = 2;
  player.setContext('engine', 'crank');
  const [assembly, piston, crank] = audio.pending;
  assembly.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
  piston.resolve();
  await settle();
  assert.equal(player.getState().contextId, 'crank');
  assert.equal(player.getState().status, 'loading');
  crank.resolve();
  await settle();
  assert.equal(player.getState().status, 'playing');
  assert.equal(audio.src, '/audio/engine/crank-heart-v1.m4a');
  assert(audio.calls.every(call => call.time === 0));
  assert.deepEqual(audio.calls.map(call => call.src), [
    '/audio/engine/assembly-heart-v1.m4a', '/audio/engine/piston-heart-v1.m4a', '/audio/engine/crank-heart-v1.m4a',
  ]);
});

test('returning to assembly stops the part; only Replay starts the overview', async () => {
  const { audio, player } = setup(true);
  player.setContext('engine', 'piston');
  await settle();
  player.setContext('engine', 'assembly', { autoplay: false });
  assert.equal(audio.paused, true);
  assert.equal(audio.src, '');
  assert.equal(audio.calls.length, 1);
  assert.equal(player.getState().clip.title, 'Assembly overview');
  await player.replay();
  assert.deepEqual(audio.calls.at(-1), { src: '/audio/engine/assembly-heart-v1.m4a', time: 0 });
});

test('unnarrated parts and leaving the lesson stop playback and pending requests', async () => {
  const { audio, player } = setup(true);
  audio.defer = true;
  player.setContext('engine', 'piston');
  player.setContext('engine', 'not-recorded-yet');
  audio.pending[0].resolve();
  await settle();
  assert.equal(audio.paused, true);
  assert.equal(audio.src, '');
  assert.equal(player.getState().clip, null);
  assert.equal(player.getState().status, 'unavailable');
  player.setContext('engine', 'crank');
  player.leave();
  audio.pending[1].reject(new Error('late failure'));
  await settle();
  assert.equal(audio.paused, true);
  assert.equal(audio.src, '');
  assert.equal(player.getState().lessonId, null);
  assert.equal(player.getState().status, 'idle');
});

test('Pause resumes at the same time; Replay restarts; Mute stops and persists silence', async () => {
  const { audio, storage, player } = setup(true);
  player.setContext('engine');
  await settle();
  audio.currentTime = 7;
  player.pause();
  assert.equal(audio.paused, true);
  assert.equal(player.getState().status, 'paused');
  await player.play();
  assert.equal(audio.calls.at(-1).time, 7);
  await player.replay();
  assert.equal(audio.calls.at(-1).time, 0);
  player.setEnabled(false);
  assert.equal(audio.paused, true);
  assert.equal(audio.muted, true);
  assert.equal(storage.getItem(AUDIO_PREFERENCE_KEY), 'false');
  const count = audio.calls.length;
  await player.replay();
  assert.equal(audio.calls.length, count);
});

test('blocked playback is recoverable with Play and keeps the transcript', async () => {
  const { audio, player } = setup(true);
  audio.rejection = Object.assign(new Error('gesture required'), { name: 'NotAllowedError' });
  player.setContext('engine');
  await settle();
  assert.equal(player.getState().status, 'blocked');
  assert.equal(player.getState().clip.transcript, narrationClips.engine.assembly.transcript);
  audio.rejection = null;
  await player.play();
  assert.equal(player.getState().status, 'playing');
});

test('missing or unsupported audio keeps the transcript and can retry with Replay', async () => {
  const { audio, player } = setup(true);
  audio.rejection = Object.assign(new Error('missing file'), { name: 'NotSupportedError' });
  player.setContext('engine', 'piston');
  await settle();
  assert.equal(player.getState().status, 'error');
  assert.equal(player.getState().clip.transcript, narrationClips.engine.piston.transcript);
  audio.rejection = null;
  await player.replay();
  assert.equal(player.getState().status, 'playing');
  audio.error = { code: 2 };
  audio.dispatchEvent(new Event('error'));
  assert.equal(player.getState().status, 'error');
  await player.replay();
  assert.equal(player.getState().status, 'playing');
});

test('ended playback is replayable; stale media events after leaving are ignored', async () => {
  const { audio, player } = setup(true);
  player.setContext('engine');
  await settle();
  audio.ended = true;
  audio.dispatchEvent(new Event('ended'));
  assert.equal(player.getState().status, 'ended');
  await player.play();
  assert.equal(audio.calls.at(-1).time, 0);
  player.leave();
  audio.ended = true;
  audio.error = { code: 4 };
  audio.dispatchEvent(new Event('ended'));
  audio.dispatchEvent(new Event('error'));
  assert.equal(player.getState().status, 'idle');
});

test('unavailable storage does not prevent choosing audio or silence', async () => {
  const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const { player, audio } = setup(undefined, { storage });
  player.setContext('engine');
  assert.equal(player.getState().enabled, null);
  player.setEnabled(true);
  await settle();
  assert.equal(player.getState().status, 'playing');
  player.setEnabled(false);
  assert.equal(audio.paused, true);
});

test('future clips use the same controller and relative deployment base', async () => {
  const extra = { earth: { mantle: { title: 'Mantle', src: 'audio/earth/mantle.m4a', transcript: 'Hot rock.' } } };
  const { audio, player } = setup(true, { clips: extra, baseUrl: '/science/' });
  assert(player.hasLesson('earth'));
  assert(!player.hasLesson('engine'));
  player.setContext('earth', 'mantle');
  await settle();
  assert.equal(audio.src, '/science/audio/earth/mantle.m4a');
  player.setContext('earth', 'crust');
  assert.equal(audio.paused, true);
});

test('transcript-only entries work without attempting to play a missing source', () => {
  const clips = { earth: { assembly: { title: 'Earth', src: null, transcript: 'Our planet.' } } };
  const { audio, player } = setup(true, { clips });
  player.setContext('earth');
  assert.equal(player.getState().status, 'unavailable');
  assert.equal(player.getState().clip.transcript, 'Our planet.');
  assert.equal(audio.calls.length, 0);
});

test('unsubscribing and destroying release listeners and stop playback', async () => {
  const { audio, player } = setup(true);
  let updates = 0;
  const unsubscribe = player.subscribe(() => updates++);
  player.setContext('engine');
  await settle();
  unsubscribe();
  const count = updates;
  player.destroy();
  audio.dispatchEvent(new Event('error'));
  assert.equal(updates, count);
  assert.equal(audio.paused, true);
});

// Read the standard MP4 movie-header duration without an OS-specific decoder.
function m4aDuration(buffer, start = 0, end = buffer.length) {
  for (let offset = start; offset + 8 <= end;) {
    const size = buffer.readUInt32BE(offset);
    const kind = buffer.toString('ascii', offset + 4, offset + 8);
    assert(size >= 8 && offset + size <= end, 'valid MP4 atom');
    if (kind === 'moov') return m4aDuration(buffer, offset + 8, offset + size);
    if (kind === 'mvhd') {
      const payload = offset + 8;
      if (buffer[payload] === 0) return buffer.readUInt32BE(payload + 16) / buffer.readUInt32BE(payload + 12);
      return Number(buffer.readBigUInt64BE(payload + 24)) / buffer.readUInt32BE(payload + 20);
    }
    offset += size;
  }
  throw new Error('MP4 duration not found');
}

test('all four lessons and every selectable part have local neural narration in the requested duration ranges', () => {
  assert.deepEqual(Object.keys(narrationClips), lessons.map(lesson => lesson.id));
  const files = [];
  for (const lesson of lessons) {
    const contexts = narrationClips[lesson.id];
    const ids = ['assembly', ...lesson.parts.map(part => part[0])];
    assert.deepEqual(Object.keys(contexts).sort(), ids.sort(), `${lesson.id}: exact part coverage`);
    for (const id of ids) {
      const clip = contexts[id];
      assert(clip.transcript.length > 0);
      assert(clip.src.endsWith(`-${narrationVoice.revision}.m4a`));
      files.push(clip.src);
      const audio = readFileSync(new URL(`../public/${clip.src}`, import.meta.url));
      assert.equal(audio.toString('ascii', 4, 8), 'ftyp');
      const duration = m4aDuration(audio);
      assert(duration >= clip.durationRange[0] && duration <= clip.durationRange[1], `${lesson.id}/${id}: ${duration}s`);
    }
  }
  assert.equal(files.length, 26);
  assert.equal(new Set(files).size, 26);
  const installed = readdirSync(new URL('../public/audio/', import.meta.url), { recursive: true }).filter(file => file.endsWith('.m4a'));
  assert.equal(installed.length, 26, 'old system-voice recordings must be removed');
});

test('the generation manifest matches the scripts, recordings and shared neural voice', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/audio/manifest.json', import.meta.url), 'utf8'));
  const sha256 = value => createHash('sha256').update(value).digest('hex');
  assert.deepEqual(manifest.voice, narrationVoice);
  assert.equal(manifest.generator, 'hyperframes@0.9.26');
  assert.equal(manifest.voice.id, 'af_heart');
  assert.equal(manifest.clips.length, 26);
  const seen = new Set();
  for (const recorded of manifest.clips) {
    const key = `${recorded.lessonId}/${recorded.contextId}`;
    assert(!seen.has(key), 'unique manifest entries');
    seen.add(key);
    const clip = narrationClips[recorded.lessonId][recorded.contextId];
    assert.equal(recorded.src, clip.src);
    assert.equal(recorded.transcriptSha256, sha256(clip.transcript), `${key}: spoken script must match transcript`);
    const audio = readFileSync(new URL(`../public/${clip.src}`, import.meta.url));
    assert.equal(recorded.audioSha256, sha256(audio), `${key}: generated recording must match`);
    assert(Math.abs(recorded.durationSeconds - m4aDuration(audio)) < 0.2);
  }
});

test('every lesson overview and part uses the shared player and correct transcript', async () => {
  const { audio, player } = setup(true);
  let count = 0;
  for (const lesson of lessons) {
    assert(player.hasLesson(lesson.id));
    for (const id of ['assembly', ...lesson.parts.map(part => part[0])]) {
      player.setContext(lesson.id, id);
      await settle();
      assert.equal(player.getState().status, 'playing');
      assert.equal(player.getState().clip.transcript, narrationClips[lesson.id][id].transcript);
      assert.equal(audio.calls.at(-1).src, `/${narrationClips[lesson.id][id].src}`);
      assert.equal(audio.calls.at(-1).time, 0);
      count++;
    }
    player.setContext(lesson.id, 'assembly', { autoplay: false });
    assert.equal(audio.paused, true);
    assert.equal(audio.calls.length, count, 'returning does not autoplay');
    await player.replay();
    assert.equal(audio.calls.at(-1).src, `/${narrationClips[lesson.id].assembly.src}`);
    count++;
    player.leave();
    assert.equal(audio.paused, true);
  }
});

test('rapid cross-lesson selections leave only the latest narration active', async () => {
  const { audio, player } = setup(true);
  audio.defer = true;
  for (const lesson of lessons) {
    for (const [id] of lesson.parts) player.setContext(lesson.id, id);
  }
  const last = audio.pending.at(-1);
  last.resolve();
  await settle();
  for (const pending of audio.pending.slice(0, -1).reverse()) {
    pending.reject(Object.assign(new Error('source replaced'), { name: 'AbortError' }));
  }
  await settle();
  assert.equal(player.getState().lessonId, 'body');
  assert.equal(player.getState().contextId, 'vessels');
  assert.equal(player.getState().status, 'playing');
  assert.equal(audio.src, `/${narrationClips.body.vessels.src}`);
  player.leave();
  assert.equal(audio.paused, true);
});
