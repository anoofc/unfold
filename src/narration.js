import { narrationClips } from './narration-clips.js';

export const AUDIO_PREFERENCE_KEY = 'unfold:narration-enabled';

function browserStorage() {
  try { return window.localStorage; } catch { return null; }
}

// One player is created for the application and shared by every lesson.
// Inject media/storage in tests; the controller has no dependency on the viewer.
export function createNarrationPlayer({
  audio = new Audio(), storage = browserStorage(), clips = narrationClips, baseUrl = '/',
} = {}) {
  let enabled = null;
  try {
    const saved = storage?.getItem(AUDIO_PREFERENCE_KEY);
    if (saved === 'true' || saved === 'false') enabled = saved === 'true';
  } catch { /* Audio still works when storage is unavailable. */ }

  let lessonId = null;
  let contextId = 'assembly';
  let clip = null;
  let status = 'idle';
  let request = 0;
  let source = null;
  const listeners = new Set();
  audio.preload = 'none';
  audio.muted = enabled !== true;

  const getState = () => ({ enabled, lessonId, contextId, clip, status });
  const notify = () => listeners.forEach(listener => listener(getState()));
  const readyStatus = () => !clip?.src ? 'unavailable' : enabled === true ? 'ready' : 'silent';

  function stop() {
    ++request;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    source = null;
  }

  async function play({ restart = false } = {}) {
    if (enabled !== true || !clip?.src || !lessonId) return;
    const attempt = ++request;
    if (source !== clip.src || status === 'error') {
      audio.pause();
      audio.src = `${baseUrl}${clip.src}`;
      source = clip.src;
      audio.load();
    }
    if (restart || audio.ended) audio.currentTime = 0;
    status = 'loading';
    notify();
    try {
      // Called synchronously from clicks to preserve browser user activation.
      await audio.play();
      if (attempt !== request) return;
      status = 'playing';
    } catch (error) {
      if (attempt !== request) return;
      status = error.name === 'NotAllowedError' ? 'blocked' : 'error';
    }
    notify();
  }

  function setContext(nextLessonId, nextContextId = 'assembly', { autoplay = true } = {}) {
    stop();
    lessonId = nextLessonId;
    contextId = nextContextId;
    clip = clips[lessonId]?.[contextId] ?? null;
    status = readyStatus();
    notify();
    if (autoplay && enabled === true) void play({ restart: true });
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    try { storage?.setItem(AUDIO_PREFERENCE_KEY, String(enabled)); } catch { /* Session choice still applies. */ }
    audio.muted = !enabled;
    stop();
    status = readyStatus();
    notify();
    if (enabled) void play({ restart: true });
  }

  function pause() {
    ++request;
    audio.pause();
    status = readyStatus() === 'ready' ? 'paused' : readyStatus();
    notify();
  }

  function leave() {
    stop();
    lessonId = null;
    contextId = 'assembly';
    clip = null;
    status = 'idle';
    notify();
  }

  function ended() {
    if (!source || !audio.ended) return;
    ++request;
    status = 'ended';
    notify();
  }

  function failed() {
    if (!source || !audio.error || (audio.currentSrc && audio.currentSrc !== audio.src)) return;
    ++request;
    audio.pause();
    status = 'error';
    notify();
  }

  audio.addEventListener('ended', ended);
  audio.addEventListener('error', failed);

  return {
    getState, setContext, setEnabled, play, pause, leave,
    hasLesson: id => Boolean(clips[id] && Object.keys(clips[id]).length),
    replay: () => play({ restart: true }),
    subscribe(listener) {
      listeners.add(listener);
      listener(getState());
      return () => listeners.delete(listener);
    },
    destroy() {
      leave();
      audio.removeEventListener('ended', ended);
      audio.removeEventListener('error', failed);
      listeners.clear();
    },
  };
}
