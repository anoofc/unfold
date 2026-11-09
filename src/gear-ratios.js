export const driverTeeth = 24;
export const drivenOptions = [18, 24, 36, 48];
export const initialDrivenTeeth = 36;

export function outputTurns(inputTurns, drivenTeeth) {
  return -inputTurns * driverTeeth / drivenTeeth;
}

export function gearSpeedFraction(drivenTeeth) {
  let divisor = driverTeeth;
  let remainder = drivenTeeth;
  while (remainder) [divisor, remainder] = [remainder, divisor % remainder];
  const numerator = driverTeeth / divisor;
  const denominator = drivenTeeth / divisor;
  return denominator === 1 ? String(numerator) : `${numerator}/${denominator}`;
}

export function isHalfSpeed(drivenTeeth) {
  return drivenTeeth === driverTeeth * 2;
}
