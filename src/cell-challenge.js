const evidenceChoices = [
  ['membrane', 'Cell membrane'],
  ['wall', 'Cell wall'],
  ['nucleus', 'Nucleus'],
  ['chloroplasts', 'Chloroplasts'],
  ['mitochondria', 'Mitochondria'],
  ['vacuole', 'Large central vacuole'],
];

const leafEvidence = new Set(['wall', 'chloroplasts', 'vacuole']);

export function cellChallenge() {
  return `<form class="cell-challenge" aria-labelledby="cell-challenge-title">
    <div class="cell-challenge-header">
      <h2 id="cell-challenge-title" tabindex="-1">Identify the cell</h2>
      <button type="button" class="cell-button" data-action="cell-exit">Back to comparison</button>
    </div>
    <label class="cell-sample-label">What kind of cell is this?
      <select name="sample" required>
        <option value="">Choose a cell type</option>
        <option value="plant">Plant cell from a leaf</option>
        <option value="animal">Animal cell</option>
      </select>
    </label>
    <fieldset><legend>Choose two structures that support your answer.</legend>
      <div class="cell-evidence">${evidenceChoices.map(([id, label]) =>
        `<label><input type="checkbox" name="evidence" value="${id}"> ${label}</label>`).join('')}</div>
    </fieldset>
    <div class="cell-challenge-result">
      <button class="cell-button cell-button-primary" type="submit">Check answer</button>
      <p class="cell-feedback" role="status"></p>
    </div>
  </form>`;
}

export function gradeCellChallenge(sample, evidence) {
  if (evidence.length !== 2 || evidence[0] === evidence[1]) return 'Choose exactly two structures.';
  if (sample === 'plant' && evidence.every(id => leafEvidence.has(id))) {
    return 'Correct. The cell wall, chloroplasts and large central vacuole are all clues that this is a leaf cell.';
  }
  return 'Try again. Think about what you saw in the leaf cell that the animal cell did not have.';
}
