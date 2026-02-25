/**
 * Extract salary range from job description text.
 * Returns { min, max } in annual USD, or null if not parseable.
 */
export function parseSalary(text: string): { min: number; max: number } | null {
  // Match patterns like "$150,000 - $200,000", "$150K-$200K", "$150,000 to $200,000"
  const rangePattern = /\$\s*([\d,]+\.?\d*)\s*[kK]?\s*[-–—to]+\s*\$?\s*([\d,]+\.?\d*)\s*[kK]?/g;
  // Match patterns like "$150,000/year", "$150K annually"
  const singlePattern = /\$\s*([\d,]+\.?\d*)\s*[kK]?\s*(?:\/?\s*(?:year|yr|annually|per\s*year|p\.?a\.?))/gi;

  let match = rangePattern.exec(text);
  if (match) {
    const min = normalizeAmount(match[1]);
    const max = normalizeAmount(match[2]);
    if (min > 0 && max > 0) {
      return { min, max };
    }
  }

  match = singlePattern.exec(text);
  if (match) {
    const amount = normalizeAmount(match[1]);
    if (amount > 0) {
      return { min: amount, max: amount };
    }
  }

  // Try range without explicit "year" — only if values look like annual salaries (> $30K)
  const looseRange = /\$\s*([\d,]+\.?\d*)\s*[kK]?\s*[-–—to]+\s*\$?\s*([\d,]+\.?\d*)\s*[kK]?/g;
  match = looseRange.exec(text);
  if (match) {
    const min = normalizeAmount(match[1]);
    const max = normalizeAmount(match[2]);
    if (min >= 30000 && max >= 30000) {
      return { min, max };
    }
  }

  return null;
}

function normalizeAmount(raw: string): number {
  const cleaned = raw.replace(/,/g, "");
  let amount = parseFloat(cleaned);
  // If the original text had K/k suffix or value is small enough to be in thousands
  if (amount > 0 && amount < 1000) {
    amount *= 1000;
  }
  return Math.round(amount);
}
