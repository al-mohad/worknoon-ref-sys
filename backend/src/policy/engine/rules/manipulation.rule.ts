import type { Check, EvaluationSignals } from '../types.js';

/** Either signal (the heuristic detector or the model) is enough to escalate. */
export function evaluateManipulation(signals: EvaluationSignals): Check {
  if (signals.manipulation) {
    return {
      rule: 'manipulation',
      scope: 'request',
      result: 'escalate',
      code: 'SUSPECTED_MANIPULATION',
      detail: 'The conversation contains a suspected attempt to steer the support system.',
    };
  }

  return {
    rule: 'manipulation',
    scope: 'request',
    result: 'pass',
    detail: 'No manipulation signal was raised.',
  };
}

export function evaluateConsistency(signals: EvaluationSignals): Check {
  if (signals.inconsistencies.length > 0) {
    return {
      rule: 'consistency',
      scope: 'request',
      result: 'escalate',
      code: 'INCONSISTENT_CLAIM',
      detail: signals.inconsistencies.join('; '),
    };
  }

  return {
    rule: 'consistency',
    scope: 'request',
    result: 'pass',
    detail: 'The claim is consistent with the order record.',
  };
}
