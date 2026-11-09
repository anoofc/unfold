export function mountNarration(host, player) {
  host.innerHTML = `<section class="narration" aria-label="Lesson narration">
    <div class="narration-heading"><h2>Listen &amp; read</h2><span class="narration-clip-title"></span><span class="narration-voice-note">AI narration</span></div>
    <div class="narration-choice">
      <p>Would you like to hear the lesson?</p>
      <div class="narration-controls"><button type="button" data-narration="start">Start with audio</button><button type="button" data-narration="silent">Explore silently</button></div>
    </div>
    <div class="narration-controls narration-playback">
      <button type="button" data-narration="play" aria-label="Play narration">Play</button>
      <button type="button" data-narration="replay" aria-label="Replay narration">Replay</button>
      <button type="button" data-narration="mute" aria-label="Mute narration" aria-pressed="false">Mute</button>
    </div>
    <p class="narration-status" role="status" aria-live="polite"></p>
    <details class="narration-transcript" open><summary>Transcript <span class="narration-transcript-title"></span></summary><p></p></details>
  </section>`;
  const panel = host.querySelector('.narration');
  const choice = panel.querySelector('.narration-choice');
  const playback = panel.querySelector('.narration-playback');
  const play = panel.querySelector('[data-narration="play"]');
  const replay = panel.querySelector('[data-narration="replay"]');
  const mute = panel.querySelector('[data-narration="mute"]');
  const title = panel.querySelector('.narration-clip-title');
  const status = panel.querySelector('.narration-status');
  const transcript = panel.querySelector('.narration-transcript');
  const transcriptTitle = transcript.querySelector('span');
  const transcriptText = transcript.querySelector('p');

  const unsubscribe = player.subscribe(state => {
    const choosing = state.enabled === null;
    const active = state.status === 'playing' || state.status === 'loading';
    choice.hidden = !choosing;
    playback.hidden = choosing;
    play.disabled = replay.disabled = state.enabled !== true || !state.clip?.src;
    play.textContent = active ? 'Pause' : 'Play';
    play.setAttribute('aria-label', active ? 'Pause narration' : 'Play narration');
    mute.textContent = state.enabled ? 'Mute' : 'Unmute';
    mute.setAttribute('aria-label', state.enabled ? 'Mute narration' : 'Unmute narration');
    mute.setAttribute('aria-pressed', String(state.enabled === false));
    title.textContent = state.clip?.title ?? 'Explore this part';
    transcript.hidden = !state.clip?.transcript;
    transcriptTitle.textContent = state.clip ? `· ${state.clip.title}` : '';
    transcriptText.textContent = state.clip?.transcript ?? '';
    const messages = {
      idle: '', ready: 'Press Play or Replay to listen.', loading: 'Opening narration…',
      playing: 'Narration is playing. Animation has its own controls.', paused: 'Narration paused. Press Play to continue.',
      ended: 'That’s the end. Press Replay to listen again.', silent: 'Audio is off. Choose Unmute whenever you want to listen.',
      blocked: 'Press Play to start the audio. You can keep exploring.',
      error: 'The audio couldn’t play. You can read the transcript or try Replay.',
      unavailable: 'No audio for this part yet. You can still read about it in the part panel.',
    };
    status.textContent = choosing ? 'Your audio choice will be remembered on this device.' : messages[state.status];
  });

  function click(event) {
    const action = event.target.closest('[data-narration]')?.dataset.narration;
    switch (action) {
      case 'start': player.setEnabled(true); break;
      case 'silent': player.setEnabled(false); break;
      case 'play': {
        const { status } = player.getState();
        if (status === 'playing' || status === 'loading') player.pause();
        else void player.play();
        break;
      }
      case 'replay': void player.replay(); break;
      case 'mute': player.setEnabled(!player.getState().enabled); break;
    }
    // The choice buttons disappear after a decision; keep keyboard focus on a control.
    if (action === 'start' || action === 'silent') mute.focus({ preventScroll: true });
  }
  panel.addEventListener('click', click);
  return () => { unsubscribe(); panel.removeEventListener('click', click); };
}
