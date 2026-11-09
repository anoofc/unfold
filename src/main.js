import './style.css';
import { lessons } from './lessons.js';
import { createNarrationPlayer } from './narration.js';
import { mountNarration } from './narration-ui.js';
import { cellChallenge, gradeCellChallenge } from './cell-challenge.js';

const icons = {
  star: '<path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6 6-6-6 6-6"/>',
  play: '<path d="M8 5.5 19 12 8 18.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M9 5v14M15 5v14" stroke-width="3"/>',
  orbit: '<circle cx="12" cy="12" r="7"/><ellipse cx="12" cy="12" rx="11" ry="3.4" transform="rotate(-37 12 12)"/>',
  reset: '<path d="M4 11a8 8 0 1 1 2 6m-2-11v5h5"/>',
  fullscreen: '<path d="M9 4H4v5m11-5h5v5m0 6v5h-5m-6 0H4v-5"/>',
  collapse: '<path d="M4 9h5V4m6 0v5h5m0 6h-5v5m-6 0v-5H4"/>',
  hand: '<path d="M9 13V6a1.5 1.5 0 0 1 3 0v5-1a1.5 1.5 0 0 1 3 0v2-1a1.5 1.5 0 0 1 3 0v2a1.5 1.5 0 0 1 3 0v3a5 5 0 0 1-5 5h-3a4 4 0 0 1-3-1l-5-5a1.7 1.7 0 0 1 2-2l2 1"/>',
  pan: '<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
  zoom: '<circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 5.5 5.5M7.5 10h5m-2.5-2.5v5"/>',
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5m-9 5L3 7m9 5v10"/>',
  engine: '<path d="M3 9h5l3-3h6l4 3v8h-5l-2 3H7l-4-4V9Zm1 4H1m20 0h2m-8-7V3m-3 0h6"/>',
  earth: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 6-5 12 0 18 5-6 5-12 0-18Z"/>',
  telephone: '<path d="M3 10c4-5 14-5 18 0v4h-5l-1-3H9l-1 3H3v-4Zm4 8h10"/>',
  body: '<path d="M12 20 4 12a4.7 4.7 0 0 1 8-5 4.7 4.7 0 0 1 8 5l-8 8Z"/><path d="M5 12h4l2-3 2 5 2-2h4"/>',
  cells: '<rect x="2" y="6" width="9" height="12" rx="2"/><circle cx="6.5" cy="12" r="1.5"/><ellipse cx="17.5" cy="12" rx="4.5" ry="5"/><circle cx="17.5" cy="12" r="1.5"/>',
};
const icon = (name, size = 20) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
const app = document.querySelector('#app');
const base = import.meta.env.BASE_URL;
const narration = createNarrationPlayer({ baseUrl: base });
let unmountNarration;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const lastLessonNumber = lessons.at(-1).number;
let viewer;
let routeVersion = 0;

function header() {
  return `<header class="header shell">
    <a class="wordmark" href="#" aria-label="Unfold home"><span class="brand-icon">${icon('star', 19)}</span><span>Unfold<span class="wordmark-period">.</span></span></a>
    <div class="header-meta"><span class="header-label">INTERACTIVE SCIENCE</span><span class="header-divider"></span><img src="${base}eis-logo.png" alt="EIS" width="43" height="16"><button type="button" data-action="page-fullscreen" class="icon-button page-fullscreen-button" aria-label="Enter page full screen" title="Enter page full screen" aria-pressed="false" ${document.fullscreenEnabled && document.documentElement.requestFullscreen ? '' : 'hidden'}>${icon('fullscreen')}</button></div>
  </header>`;
}

function updateFullscreenControls() {
  const pageExpanded = document.fullscreenElement === document.documentElement;
  const pageButton = app.querySelector('[data-action="page-fullscreen"]');
  if (pageButton) {
    const label = pageExpanded ? 'Exit page full screen' : 'Enter page full screen';
    pageButton.innerHTML = icon(pageExpanded ? 'collapse' : 'fullscreen');
    pageButton.setAttribute('aria-label', label);
    pageButton.setAttribute('aria-pressed', String(pageExpanded));
    pageButton.title = label;
  }
  const stage = app.querySelector('.stage');
  if (!stage) return;
  if (!pageExpanded) stage.classList.remove('is-expanded');
  const expanded = stage.classList.contains('is-expanded') || document.fullscreenElement === stage;
  // Keep the rest of the page out of the tab order while the model covers it.
  for (let element = stage; element !== app; element = element.parentElement) {
    for (const sibling of element.parentElement.children) {
      if (sibling !== element) sibling.inert = expanded;
    }
  }
  const modelButton = stage.querySelector('[data-action="fullscreen"]');
  const label = expanded ? 'Exit model full screen' : 'Model full screen';
  modelButton.innerHTML = icon(expanded ? 'collapse' : 'fullscreen');
  modelButton.setAttribute('aria-label', label);
  modelButton.setAttribute('aria-pressed', String(expanded));
  modelButton.title = label;
}

function starfield(count, width, height, initialSeed) {
  let seed = initialSeed;
  const random = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, () =>
    `<circle cx="${(random() * width).toFixed(1)}" cy="${(random() * height).toFixed(1)}" r="${(0.55 + random() * 1.05).toFixed(1)}" opacity="${(0.13 + random() * 0.45).toFixed(2)}"/>`
  ).join('');
}

function heroArt() {
  return `<svg class="hero-art" viewBox="0 0 600 376" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id="planet" cx=".31" cy=".23" r=".76">
        <stop stop-color="#d8c5ff"/><stop offset=".35" stop-color="#9581e9"/><stop offset=".72" stop-color="#514099"/><stop offset="1" stop-color="#231748"/>
      </radialGradient>
      <radialGradient id="halo"><stop stop-color="#a987ff" stop-opacity=".41"/><stop offset="1" stop-color="#6b46cd" stop-opacity="0"/></radialGradient>
      <linearGradient id="orbit-grad"><stop stop-color="#63518d" stop-opacity=".25"/><stop offset=".57" stop-color="#c6acff" stop-opacity=".95"/><stop offset="1" stop-color="#bba1ff" stop-opacity=".35"/></linearGradient>
      <clipPath id="planet-clip"><circle cx="318" cy="186" r="75"/></clipPath>
    </defs>
    <g fill="#d2bbff">${starfield(87, 600, 376, 784)}</g>
    <circle cx="318" cy="186" r="162" fill="url(#halo)"/>
    <g stroke="#8f73c2" stroke-opacity=".30"><circle cx="318" cy="186" r="118" stroke-dasharray="2 7"/><circle cx="318" cy="186" r="154"/><circle cx="318" cy="186" r="179" stroke-dasharray="2 8"/></g>
    <ellipse cx="318" cy="186" rx="216" ry="71" transform="rotate(-22 318 186)" stroke="url(#orbit-grad)" stroke-width="1.1"/>
    <ellipse cx="318" cy="186" rx="179" ry="60" transform="rotate(29 318 186)" stroke="#9776d9" stroke-opacity=".42"/>
    <circle cx="318" cy="186" r="75" fill="url(#planet)"/>
    <g clip-path="url(#planet-clip)" transform="rotate(-22 318 186)" stroke="#e4d4ff">
      <path d="M231 164c69-18 123-10 175 16m-168-25c54-20 115-15 170 9m-175 22c61-20 128-14 174 7m-169 10c62-19 121-11 172 12m-174 2c62-14 124-4 174 20m-167-2c45-5 105 4 155 27" opacity=".24" stroke-width="3"/>
      <path d="M221 150c58-20 137-17 183 3m-173 50c58-16 137-10 181 17" opacity=".21" stroke-width="7"/>
    </g>
    <circle cx="318" cy="186" r="75" stroke="#c4acff" stroke-opacity=".43"/>
    <path d="M118 249c29 41 160 21 292-36 89-39 140-84 103-109" stroke="url(#orbit-grad)" stroke-width="1.5"/>
    <circle cx="466" cy="186" r="7" fill="#bc9fff"/><circle cx="466" cy="186" r="15" stroke="#bc9fff" stroke-opacity=".44"/>
    <circle cx="171" cy="219" r="4.5" fill="#d6c3ff"/><circle cx="367" cy="65" r="3" fill="#d6c3ff"/>
    <path d="M440 83v24m-12-12h24M200 112v14m-7-7h14M474 259v14m-7-7h14M249 288v10m-5-5h10" stroke="#ddcaff" stroke-opacity=".81"/>
    <text x="488" y="289" fill="#ad97d1" font-size="10" font-family="monospace" letter-spacing="2.2">FIG. 01</text>
  </svg>`;
}

function home(version) {
  document.title = 'Unfold. — Explore how things work.';
  app.innerHTML = `${header()}<main class="shell">
    <section class="hero">
      ${heroArt()}
      <div class="hero-copy">
        <p class="eyebrow"><span></span> THE 3D SCIENCE LAB</p>
        <h1>Explore how<br>things <em>work.</em></h1>
        <p>Look inside everyday wonders. Spin them around, take them apart, and see what makes them work.</p>
        <a class="primary-button" href="#lessons">Explore the lessons ${icon('arrow', 19)}</a>
      </div>
    </section>
    <section class="catalog" id="lessons" aria-labelledby="catalog-title">
      <div class="catalog-heading"><div><p class="eyebrow">YOUR SCIENCE LAB</p><h2 id="catalog-title" tabindex="-1">Sample lessons</h2></div>
      <span class="catalog-count">01 — ${lastLessonNumber}</span></div>
      <div class="cards">${lessons.map(lesson => `
        <a class="card ${lesson.id}" href="#lesson/${lesson.id}">
          <div class="card-art">
            <span class="card-number">${lesson.number}</span>
            <span class="fallback-icon">${icon(lesson.id, 58)}</span>
            <canvas aria-hidden="true" data-thumbnail="${lesson.id}"></canvas>
          </div>
          <div class="card-copy">
            <p class="card-category">${lesson.category}</p>
            <h3>${lesson.title}</h3>
            <p class="card-description">${lesson.card}</p>
            <span class="card-arrow">${icon('arrow', 17)}</span>
          </div>
        </a>
      `).join('')}</div>
    </section>
  </main><footer class="shell footer"><span>UNFOLD. <span class="footer-separator">/</span> THE 3D SCIENCE LAB</span><span>BUILT FOR CURIOUS MINDS</span></footer>`;

  const scrollToLessons = () => {
    document.querySelector('#catalog-title').focus({ preventScroll: true });
    document.querySelector('#lessons').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  };
  app.querySelector('.primary-button').addEventListener('click', event => {
    event.preventDefault();
    history.pushState(null, '', '#lessons');
    scrollToLessons();
  });
  if (location.hash === '#lessons') requestAnimationFrame(scrollToLessons);

  import('./viewer.js').then(({ drawThumbnails }) => {
    if (routeVersion !== version) return;
    return drawThumbnails(Array.from(app.querySelectorAll('[data-thumbnail]'), canvas => [canvas.dataset.thumbnail, canvas]));
  }).catch(() => {
    // The catalog remains usable with symbolic illustrations when WebGL is unavailable.
  });
}

function lessonPage(lesson, version, focusHeading) {
  const comparingCells = lesson.id === 'cells';
  document.title = `${lesson.title} — Unfold.`;
  app.innerHTML = `${header()}<main class="shell lesson-shell">
    <a href="#lessons" class="back-link">${icon('back', 18)} All lessons</a>
    <div class="lesson-top">
      <div><p class="eyebrow"><span></span> LESSON ${lesson.number} <span class="category-divider"></span> ${lesson.category}</p>
      <h1 id="lesson-title" tabindex="-1">${lesson.title}</h1></div>
      <div class="lesson-counter">LESSON <strong>${lesson.number}</strong> / ${lastLessonNumber}</div>
    </div>
    <section class="lesson-layout ${lesson.id}" aria-labelledby="lesson-title">
      <aside class="lesson-info">
        <div class="lesson-details" aria-live="polite"></div>
        <div class="parts">
          <h2>Pick a part</h2>
          <div class="part-list">${lesson.parts.map(([id, name], i) => `<button type="button" data-part="${id}" aria-pressed="false"><span>${String(i + 1).padStart(2, '0')}</span>${name}</button>`).join('')}</div>
        </div>
        <a class="source-link" href="${lesson.source[1]}" target="_blank" rel="noopener noreferrer">Learn more · ${lesson.source[0]} <span aria-hidden="true">↗</span></a>
        ${lesson.assetCredit ? `<a class="source-link" href="${base}${lesson.assetCredit}" target="_blank" rel="noopener noreferrer">3D anatomy model credits <span aria-hidden="true">↗</span></a>` : ''}
      </aside>
      <div class="stage">
        <div class="stage-top"><span class="stage-badge">${icon('cube', 15)} <span>ASSEMBLY VIEW</span></span>
          <div class="stage-actions">
            <button type="button" data-action="pan" class="icon-button" aria-label="Pan mode" aria-pressed="false" title="Pan mode · drag to move the model" disabled>${icon('pan')}</button>
            <button type="button" data-action="reset" class="icon-button" aria-label="Reset view" title="Reset view">${icon('reset')}</button>
            <button type="button" data-action="fullscreen" class="icon-button" aria-label="Full screen" title="Full screen">${icon('fullscreen')}</button>
          </div>
        </div>
        <div class="stage-center">
          <svg class="stage-sky" viewBox="0 0 720 490" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <g fill="#c2a6ff">${starfield(70, 720, 490, 341)}</g>
            <g fill="none" stroke="#a183de" stroke-opacity=".20"><circle cx="360" cy="246" r="145" stroke-dasharray="2 7"/><circle cx="360" cy="246" r="204"/><circle cx="360" cy="246" r="233" stroke-dasharray="1 9"/></g>
          </svg>
          <div class="model-host"><p class="loading" role="status">Opening 3D model…</p></div>
          <button type="button" data-action="previous" class="icon-button part-arrow previous" aria-label="Previous part" hidden>${icon('left')}</button>
          <button type="button" data-action="next" class="icon-button part-arrow next" aria-label="Next part" hidden>${icon('right')}</button>
        </div>
        <div class="stage-footer"><div class="stage-bottom"></div>${narration.hasLesson(lesson.id) ? '<div class="narration-host"></div>' : ''}</div>
      </div>
    </section>
    <div class="gesture-row"><span>${icon('hand', 17)} Drag to rotate</span><span>${icon('pan', 17)} Pan mode, right-drag or two fingers</span><span>${icon('zoom', 17)} Scroll or pinch to zoom</span><span>${icon('cube', 17)} <span class="tap-hint">Tap a part to explore</span></span></div>
  </main>`;

  const details = app.querySelector('.lesson-details');
  const stage = app.querySelector('.stage');
  const host = app.querySelector('.model-host');
  const stageBottom = stage.querySelector('.stage-bottom');
  const narrationHost = stage.querySelector('.narration-host');
  const partButtons = Array.from(app.querySelectorAll('[data-part]'));
  const previous = stage.querySelector('[data-action="previous"]');
  const next = stage.querySelector('[data-action="next"]');
  const full = stage.querySelector('[data-action="fullscreen"]');
  const reset = stage.querySelector('[data-action="reset"]');
  const pan = stage.querySelector('[data-action="pan"]');
  const parts = app.querySelector('.parts');
  let selected = -1;
  let currentStage = 0;
  let playing = !comparingCells && !reducedMotion.matches;
  let available = false;
  let loadFailed = false;
  let wallVisible = true;
  let challenge = false;

  if (narrationHost) {
    unmountNarration = mountNarration(narrationHost, narration);
    narration.setContext(lesson.id);
  }

  function updateStage() {
    const preview = stageBottom.querySelector('.demo-caption');
    if (!preview) return;
    preview.textContent = lesson.stageNotes[currentStage];
    stageBottom.querySelectorAll('.cycle-step').forEach((step, i) => step.classList.toggle('active', i === currentStage));
  }
  function updateInfo() {
    const part = lesson.parts[selected];
    details.innerHTML = part
      ? `<p class="eyebrow">PART ${String(selected + 1).padStart(2, '0')} / ${String(lesson.parts.length).padStart(2, '0')}</p>
        <h2>${part[1]}</h2><p class="info-label">What it does</p><p>${part[2]}</p><p class="info-label">How it works</p><p>${part[3]}</p>`
      : challenge
        ? '<p class="eyebrow">CHALLENGE</p><h2>Look for clues</h2><p>Rotate and zoom to inspect the sample, then use what you noticed in the comparison to identify it.</p>'
        : `<p class="eyebrow">DISCOVER</p><h2>${comparingCells ? 'Compare the cells' : 'How it works'}</h2><p>${lesson.intro}</p>`;
    stage.querySelector('.stage-badge span').textContent = part ? 'PART VIEW' : challenge ? 'UNKNOWN SAMPLE' : comparingCells ? 'CELL COMPARISON' : 'ASSEMBLY VIEW';
    app.querySelector('.tap-hint').textContent = part ? 'Tap empty space to go back' : challenge ? 'Inspect the unknown sample' : 'Tap a part to explore';
    parts.hidden = challenge;
    previous.hidden = next.hidden = !part || !available;
    partButtons.forEach((button, i) => button.setAttribute('aria-pressed', i === selected));
    if (part) {
      stageBottom.innerHTML = `<button type="button" class="return-button" data-action="assembly">${icon('back', 18)} ${comparingCells ? 'Back to comparison' : 'Back to assembly'}</button><span class="empty-hint">Tap empty space to go back</span>`;
    } else if (challenge) {
      stageBottom.innerHTML = cellChallenge();
    } else if (comparingCells) {
      stageBottom.innerHTML = `<div class="cell-comparison-controls">
        <div class="cell-legend"><span>Leaf cell model</span><span>Animal cell model</span></div>
        <div class="cell-actions">
          <button type="button" class="cell-button" data-action="cell-wall" ${available ? '' : 'disabled'}>${wallVisible ? 'Peel back wall' : 'Restore cell wall'}</button>
          <button type="button" class="cell-button cell-button-primary" data-action="cell-start" ${available ? '' : 'disabled'}>Start challenge</button>
        </div>
      </div>`;
    } else {
      stageBottom.innerHTML = `<button type="button" class="play-button" data-action="play" aria-label="${playing ? 'Pause' : 'Play'} animation" aria-pressed="${playing}" ${available ? '' : 'disabled'}>${icon(playing ? 'pause' : 'play', 24)}</button>
        <div class="demo-copy"><p class="demo-title">${lesson.demo}</p><p class="demo-caption"></p></div>
        ${lesson.stages.length > 1 ? `<div class="cycle">${lesson.stages.map((name, i) => `<span class="cycle-step"><span>${i + 1}</span> ${name}</span>`).join('')}</div>` : ''}`;
      updateStage();
    }
    pan.disabled = reset.disabled = !available;
    if (loadFailed) full.hidden = true;
  }
  function select(id, clickedObject) {
    if (challenge) return;
    const index = lesson.parts.findIndex(part => part[0] === id);
    if (index < 0) return;
    if (available && comparingCells && id === 'wall' && !wallVisible) {
      wallVisible = true;
      viewer.setModelView({ wallVisible, challenge });
    }
    if (available && !viewer.isolate(id, clickedObject)) return;
    selected = index;
    updateInfo();
    narration.setContext(lesson.id, id);
  }
  function back(focusPlay = false) {
    if (selected < 0) return;
    selected = -1;
    viewer?.showAssembly();
    updateInfo();
    narration.setContext(lesson.id, 'assembly', { autoplay: false });
    if (focusPlay) stage.querySelector(comparingCells ? '[data-action="cell-wall"]' : '.play-button')?.focus();
  }
  function movePart(offset) {
    select(lesson.parts[(selected + offset + lesson.parts.length) % lesson.parts.length][0]);
  }
  full.hidden = !stage.requestFullscreen;
  partButtons.forEach(button => button.addEventListener('click', () => select(button.dataset.part)));
  stage.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    switch (button?.dataset.action) {
      case 'play':
        playing = !playing;
        viewer?.setPlaying(playing);
        button.innerHTML = icon(playing ? 'pause' : 'play', 24);
        button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} animation`);
        button.setAttribute('aria-pressed', playing);
        break;
      case 'assembly': back(event.detail === 0); break;
      case 'cell-wall':
        wallVisible = !wallVisible;
        viewer.setModelView({ wallVisible, challenge });
        button.textContent = wallVisible ? 'Peel back wall' : 'Restore cell wall';
        break;
      case 'cell-start':
      case 'cell-exit':
        challenge = button.dataset.action === 'cell-start';
        viewer.setModelView({ wallVisible: challenge || wallVisible, challenge }, true);
        if (narrationHost) narrationHost.hidden = challenge;
        if (challenge) narration.leave();
        else narration.setContext(lesson.id, 'assembly', { autoplay: false });
        updateInfo();
        stage.querySelector(challenge ? '#cell-challenge-title' : '[data-action="cell-start"]').focus();
        break;
      case 'pan': {
        const enabled = pan.getAttribute('aria-pressed') !== 'true';
        pan.setAttribute('aria-pressed', String(enabled));
        viewer?.setPanMode(enabled);
        break;
      }
      case 'reset': viewer?.resetView(); break;
      case 'previous': movePart(-1); break;
      case 'next': movePart(1); break;
      case 'fullscreen': {
        if (document.fullscreenElement === document.documentElement) {
          // Expand within page fullscreen so closing the model never exits it.
          stage.classList.toggle('is-expanded');
          updateFullscreenControls();
          full.focus();
          break;
        }
        const action = document.fullscreenElement === stage ? document.exitFullscreen() : stage.requestFullscreen();
        action.catch(() => {
          full.hidden = true;
          reset.focus();
        });
        break;
      }
    }
  });
  stage.addEventListener('submit', event => {
    if (!event.target.matches('.cell-challenge')) return;
    event.preventDefault();
    const answers = new FormData(event.target);
    event.target.querySelector('.cell-feedback').textContent = gradeCellChallenge(answers.get('sample'), answers.getAll('evidence'));
  });
  app.querySelector('main').addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.fullscreenElement) back(true);
  });
  updateInfo();
  if (focusHeading) app.querySelector('#lesson-title').focus({ preventScroll: true });

  import('./viewer.js').then(async ({ createViewer, prepareViewerModel }) => {
    if (routeVersion !== version) return;
    await prepareViewerModel(lesson.id);
    if (routeVersion !== version) return;
    viewer = createViewer(host, lesson, {
      onSelect: select, onBack: back, autoPlay: playing,
      onStage(index) { currentStage = index; updateStage(); },
    });
    available = true;
    host.querySelector('.loading')?.remove();
    if (selected >= 0) viewer.isolate(lesson.parts[selected][0]);
    updateInfo();
  }).catch(() => {
    if (routeVersion !== version) return;
    loadFailed = true;
    host.innerHTML = '<p class="loading" role="status">The 3D viewer couldn’t open. You can still read about the parts here.</p>';
    updateInfo();
  });
}

function render(focusHeading = false) {
  const version = ++routeVersion;
  unmountNarration?.();
  unmountNarration = null;
  narration.leave();
  viewer?.destroy();
  viewer = null;
  const route = /^#lesson\/([a-z]+)$/.exec(location.hash);
  const lesson = lessons.find(entry => entry.id === route?.[1]);
  if (lesson) {
    lessonPage(lesson, version, focusHeading);
    window.scrollTo(0, 0);
  } else {
    home(version);
    if (location.hash !== '#lessons') window.scrollTo(0, 0);
  }
  updateFullscreenControls();
}

app.addEventListener('click', async event => {
  const button = event.target.closest('[data-action="page-fullscreen"]');
  if (!button) return;
  try {
    if (document.fullscreenElement === document.documentElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    button.title = 'Page full screen is unavailable in this browser';
  }
});
document.addEventListener('fullscreenchange', updateFullscreenControls);
window.addEventListener('pagehide', () => narration.leave());
window.addEventListener('pageshow', event => { if (event.persisted) render(); });
window.addEventListener('hashchange', () => render(true));
render();
