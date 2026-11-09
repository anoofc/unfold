import { driverTeeth, drivenOptions, initialDrivenTeeth, outputTurns, gearSpeedFraction, isHalfSpeed } from './gear-ratios.js';

const formatTurns = turns => Math.abs(turns).toFixed(2);

function directionLabel(turns) {
  if (Math.abs(turns) < 0.005) return 'at start';
  return turns > 0 ? 'clockwise' : 'counterclockwise';
}

export function createGearExperiment(host, { setView, toggleChallenge, reducedMotion }) {
  let drivenTeeth = initialDrivenTeeth;
  let direction = 1;
  let currentTurns = 0;
  let targetTurns = 0;
  let challenge = false;

  function drawTurns(turns) {
    currentTurns = turns;
    const input = host.querySelector('[data-gear-input]');
    if (!input) return;
    const output = host.querySelector('[data-gear-output]');
    const outputValue = outputTurns(turns, drivenTeeth);
    input.textContent = `${formatTurns(turns)} turns · ${directionLabel(turns)}`;
    output.textContent = `${formatTurns(outputValue)} turns · ${directionLabel(outputValue)}`;
  }

  function drawSpeed() {
    const speed = host.querySelector('[data-gear-speed]');
    if (speed) speed.textContent = `Output speed is ${gearSpeedFraction(drivenTeeth)}× input speed.`;
  }

  function resetTurns() {
    targetTurns = 0;
    setView({ drivenTeeth, inputTurns: 0, animate: false });
    drawTurns(0);
    drawSpeed();
  }

  host.addEventListener('change', event => {
    if (event.target.matches('[data-gear-driven]')) {
      drivenTeeth = Number(event.target.value);
      host.querySelector('.gear-output-label').textContent = `Output · ${drivenTeeth} teeth`;
      resetTurns();
      host.querySelector('[data-gear-feedback]').textContent = '';
    } else if (event.target.matches('[data-gear-direction]')) {
      direction = Number(event.target.value);
    }
  });

  host.addEventListener('click', event => {
    const action = event.target.closest('[data-gear-action]')?.dataset.gearAction;
    switch (action) {
      case 'turn':
        targetTurns += direction;
        setView({ inputTurns: targetTurns, animate: !reducedMotion.matches });
        if (reducedMotion.matches) drawTurns(targetTurns);
        break;
      case 'zero':
        resetTurns();
        break;
      case 'challenge':
        toggleChallenge(!challenge);
        host.querySelector(challenge ? '#gear-challenge-title' : '[data-gear-action="challenge"]').focus();
        break;
      case 'check':
        host.querySelector('[data-gear-feedback]').textContent = isHalfSpeed(drivenTeeth)
          ? `Correct. The ${drivenTeeth}-tooth gear makes half a turn for each full turn of the ${driverTeeth}-tooth driver.`
          : 'Try again. Look for a gear that turns through half a revolution when the driver turns once.';
        break;
    }
  });

  return {
    drawTurns,
    render(available, challengeActive) {
      challenge = challengeActive;
      host.innerHTML = `<div class="gear-experiment">
        ${challenge ? '<h2 id="gear-challenge-title" tabindex="-1">Make the output turn at half speed</h2>' : ''}
        <div class="gear-readout">
          <div><span class="gear-input-label">Input · ${driverTeeth} teeth</span><strong data-gear-input></strong></div>
          <div><span class="gear-output-label">Output · ${drivenTeeth} teeth</span><strong data-gear-output></strong></div>
        </div>
        <p class="gear-speed">Counters show net turns since the last reset.${challenge ? '' : ' <span data-gear-speed></span>'}</p>
        <div class="gear-controls">
          <label>Driven gear <select data-gear-driven ${available ? '' : 'disabled'}>
            ${drivenOptions.map(teeth => `<option value="${teeth}" ${teeth === drivenTeeth ? 'selected' : ''}>${teeth} teeth</option>`).join('')}
          </select></label>
          <label>Crank direction <select data-gear-direction ${available ? '' : 'disabled'}>
            <option value="1" ${direction === 1 ? 'selected' : ''}>Clockwise</option>
            <option value="-1" ${direction === -1 ? 'selected' : ''}>Counterclockwise</option>
          </select></label>
          <button type="button" class="gear-button gear-button-primary" data-gear-action="turn" ${available ? '' : 'disabled'}>Turn crank</button>
          <button type="button" class="gear-button" data-gear-action="zero" ${available ? '' : 'disabled'}>Zero counters</button>
        </div>
        <div class="gear-challenge-controls">
          ${challenge ? '<button type="button" class="gear-button gear-button-primary" data-gear-action="check">Check setup</button>' : ''}
          <button type="button" class="gear-button" data-gear-action="challenge" ${available ? '' : 'disabled'}>${challenge ? 'Back to experiment' : 'Start challenge'}</button>
          <p class="gear-feedback" role="status" data-gear-feedback></p>
        </div>
      </div>`;
      drawTurns(currentTurns);
      drawSpeed();
    },
  };
}
