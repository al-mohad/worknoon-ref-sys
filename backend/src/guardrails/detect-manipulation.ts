interface WeightedPattern {
  label: string;
  weight: number;
  pattern: RegExp;
}

/**
 * Weighted heuristics, not a single trigger-happy pattern. A message needs
 * either one strong signal or two weaker ones before it's flagged, which
 * keeps ordinary complaints ("please ignore the scuffs on the box, the
 * item itself is broken") from tripping the detector on the word "ignore"
 * alone. This result is a signal recorded on the request, not a gate.
 */
const PATTERNS: WeightedPattern[] = [
  {
    label: 'instruction_override',
    weight: 3,
    pattern: /\b(ignore|disregard|forget)\b(?:\s+\w+){0,3}\s+(previous|prior|above|earlier|all)\b(?:\s+\w+){0,3}\s+(instructions?|rules?|prompt|policy)\b/i,
  },
  {
    label: 'fake_system_notice',
    weight: 3,
    pattern: /\b(system|admin|developer)\s*:\s|\bpolicy\s+(has\s+been\s+|was\s+|is\s+)?updated\b|\bnew\s+(policy|instructions?|rules?)\s*:/i,
  },
  {
    label: 'role_override',
    weight: 2,
    pattern: /\byou\s+are\s+now\b|\bact\s+as\s+(a|an|the)\b|\bfrom\s+now\s+on\s+you\b|\bpretend\s+(you|to\s+be)\b/i,
  },
  {
    label: 'authority_impersonation',
    weight: 2,
    pattern: /\bi\s*(am|'m)\s+(the\s+)?(ceo|owner|founder|admin|administrator|developer|support\s+(agent|staff|manager))\b/i,
  },
  {
    label: 'reveal_instructions',
    weight: 2,
    pattern: /\b(reveal|show|print|repeat|what\s+(are|is))\s+(your\s+|the\s+)?(system\s+prompt|instructions|rules)\b/i,
  },
  {
    label: 'forced_approval',
    weight: 2,
    pattern: /\bapprove\b(?:\s+\w+){0,4}\s+\$\s?\d|\bapprove(d)?\b(?:\s+\w+){0,3}\s+automatically\b/i,
  },
  {
    label: 'encoded_blob',
    weight: 1,
    pattern: /[A-Za-z0-9+/]{40,}={0,2}/,
  },
];

const FLAG_THRESHOLD = 2;

export interface ManipulationSignal {
  flagged: boolean;
  score: number;
  matchedLabels: string[];
}

export function detectManipulation(text: string): ManipulationSignal {
  const matched: string[] = [];
  let score = 0;

  for (const { label, weight, pattern } of PATTERNS) {
    if (pattern.test(text)) {
      matched.push(label);
      score += weight;
    }
  }

  return { flagged: score >= FLAG_THRESHOLD, score, matchedLabels: matched };
}
