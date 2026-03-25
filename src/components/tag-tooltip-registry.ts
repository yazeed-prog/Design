// ─── Tooltip data for every function, operator, keyword & variable tag ─────────
// Each entry has a short description and 1–2 usage examples.

export interface TagTooltipData {
  description: string;
  examples: string[];
}

const registry: Record<string, TagTooltipData> = {
  // ── Text functions ──────────────────────────────────────────────────────────
  'length': {
    description: 'Returns the number of characters in a string or items in a list.',
    examples: ['length("hello") → 5', 'length(emails) → 3'],
  },
  'lower': {
    description: 'Converts all characters in a string to lowercase.',
    examples: ['lower("Hello World") → "hello world"'],
  },
  'upper': {
    description: 'Converts all characters in a string to uppercase.',
    examples: ['upper("hello") → "HELLO"'],
  },
  'trim': {
    description: 'Removes leading and trailing whitespace from a string.',
    examples: ['trim("  hello  ") → "hello"'],
  },
  'substring': {
    description: 'Extracts a portion of a string between two indices.',
    examples: ['substring("hello", 0, 3) → "hel"', 'substring("world", 2) → "rld"'],
  },
  'replace': {
    description: 'Replaces occurrences of a search string with a replacement.',
    examples: ['replace("hello", "l", "r") → "herro"'],
  },
  'contains': {
    description: 'Checks if a string contains a given substring. Returns true/false.',
    examples: ['contains("hello world", "world") → true'],
  },
  'split': {
    description: 'Splits a string into an array using a delimiter.',
    examples: ['split("a,b,c", ",") → ["a", "b", "c"]'],
  },
  'toString': {
    description: 'Converts any value to its string representation.',
    examples: ['toString(42) → "42"', 'toString(true) → "true"'],
  },
  'base64': {
    description: 'Encodes a string to Base64 format.',
    examples: ['base64("hello") → "aGVsbG8="'],
  },

  // ── Text keywords ───────────────────────────────────────────────────────────
  'space': {
    description: 'Inserts a single space character.',
    examples: ['firstName + space + lastName → "John Doe"'],
  },
  'emptystring': {
    description: 'Represents an empty string value ("").',
    examples: ['if(name = emptystring, "N/A", name)'],
  },
  'newline': {
    description: 'Inserts a line break character.',
    examples: ['"Line 1" + newline + "Line 2"'],
  },

  // ── Math functions ──────────────────────────────────────────────────────────
  'sum': {
    description: 'Adds up all numeric values in a list.',
    examples: ['sum(1, 2, 3) → 6', 'sum(order.items.price) → 149.99'],
  },
  'average': {
    description: 'Calculates the arithmetic mean of numeric values.',
    examples: ['average(10, 20, 30) → 20'],
  },
  'min': {
    description: 'Returns the smallest value from a set of numbers.',
    examples: ['min(5, 3, 8) → 3'],
  },
  'max': {
    description: 'Returns the largest value from a set of numbers.',
    examples: ['max(5, 3, 8) → 8'],
  },
  'round': {
    description: 'Rounds a number to the nearest integer or decimal places.',
    examples: ['round(3.7) → 4', 'round(3.456, 2) → 3.46'],
  },
  'floor': {
    description: 'Rounds a number down to the nearest integer.',
    examples: ['floor(3.9) → 3'],
  },
  'ceil': {
    description: 'Rounds a number up to the nearest integer.',
    examples: ['ceil(3.1) → 4'],
  },
  'parseNumber': {
    description: 'Converts a string to a number.',
    examples: ['parseNumber("42.5") → 42.5'],
  },
  'sqrt': {
    description: 'Returns the square root of a number.',
    examples: ['sqrt(16) → 4'],
  },
  'abs': {
    description: 'Returns the absolute (positive) value of a number.',
    examples: ['abs(-7) → 7'],
  },
  'median': {
    description: 'Returns the middle value in a sorted list of numbers.',
    examples: ['median(1, 3, 5, 7, 9) → 5'],
  },
  'trunc': {
    description: 'Removes the decimal part of a number without rounding.',
    examples: ['trunc(3.9) → 3', 'trunc(-2.7) → -2'],
  },
  'stdevS': {
    description: 'Calculates the sample standard deviation.',
    examples: ['stdevS(2, 4, 4, 4, 5) → 1'],
  },
  'stdevP': {
    description: 'Calculates the population standard deviation.',
    examples: ['stdevP(2, 4, 4, 4, 5) → 0.89'],
  },
  'formatNumber': {
    description: 'Formats a number with locale-specific separators and decimals.',
    examples: ['formatNumber(1234.5, 2) → "1,234.50"'],
  },

  // ── Math operators ──────────────────────────────────────────────────────────
  '*': {
    description: 'Multiplies two numbers.',
    examples: ['price * quantity → 49.98'],
  },
  '/': {
    description: 'Divides one number by another.',
    examples: ['total / count → 25.5'],
  },
  'mod': {
    description: 'Returns the remainder of dividing two numbers.',
    examples: ['10 mod 3 → 1'],
  },
  '+': {
    description: 'Adds two numbers or concatenates strings.',
    examples: ['5 + 3 → 8', '"hi" + " there" → "hi there"'],
  },
  '-': {
    description: 'Subtracts one number from another.',
    examples: ['10 - 4 → 6'],
  },

  // ── Date functions ──────────────────────────────────────────────────────────
  'formatDate': {
    description: 'Formats a date into a string using a pattern.',
    examples: ['formatDate(now, "YYYY-MM-DD") → "2026-02-25"'],
  },
  'addDays': {
    description: 'Adds a number of days to a date.',
    examples: ['addDays(now, 7) → next week\'s date'],
  },
  'addHours': {
    description: 'Adds a number of hours to a date.',
    examples: ['addHours(now, 2) → 2 hours from now'],
  },
  'now': {
    description: 'Returns the current date and time.',
    examples: ['now → "2026-02-25T14:30:00Z"'],
  },
  'beginning_of_month': {
    description: 'Returns the first day of the month for a given date.',
    examples: ['beginning_of_month(now) → "2026-02-01"'],
  },
  'end_of_month': {
    description: 'Returns the last day of the month for a given date.',
    examples: ['end_of_month(now) → "2026-02-28"'],
  },
  'differenceInDays': {
    description: 'Calculates the number of days between two dates.',
    examples: ['differenceInDays(endDate, startDate) → 14'],
  },

  // ── List functions ──────────────────────────────────────────────────────────
  'map': {
    description: 'Transforms each item in a list using a function.',
    examples: ['map(users, user → user.name) → ["Alice", "Bob"]'],
  },
  'filter': {
    description: 'Returns only items that match a condition.',
    examples: ['filter(orders, o → o.total > 100)'],
  },
  'reduce': {
    description: 'Reduces a list to a single value using an accumulator.',
    examples: ['reduce(nums, (acc, n) → acc + n, 0) → 15'],
  },
  'get': {
    description: 'Gets an item from a list by index or a value from an object by key.',
    examples: ['get(list, 0) → first item', 'get(obj, "name") → "Alice"'],
  },
  'join': {
    description: 'Combines all items in a list into a single string.',
    examples: ['join(["a","b","c"], ", ") → "a, b, c"'],
  },
  'flatten': {
    description: 'Flattens a nested list into a single-level list.',
    examples: ['flatten([[1,2],[3,4]]) → [1, 2, 3, 4]'],
  },
  'unique': {
    description: 'Removes duplicate values from a list.',
    examples: ['unique([1, 2, 2, 3]) → [1, 2, 3]'],
  },
  'sort': {
    description: 'Sorts items in a list in ascending order.',
    examples: ['sort([3, 1, 2]) → [1, 2, 3]'],
  },

  // ── Logic functions ─────────────────────────────────────────────────────────
  'if': {
    description: 'Returns one value if a condition is true, another if false.',
    examples: ['if(age >= 18, "adult", "minor")'],
  },
  'ifempty': {
    description: 'Returns a fallback value if the input is empty or null.',
    examples: ['ifempty(name, "Unknown") → "Unknown"'],
  },
  'switch': {
    description: 'Matches a value against cases and returns the result.',
    examples: ['switch(status, "active", "✓", "inactive", "✗", "?")'],
  },
  'pick': {
    description: 'Selects only specified keys from an object.',
    examples: ['pick(user, "name", "email") → {name, email}'],
  },
  'omit': {
    description: 'Returns an object with specified keys removed.',
    examples: ['omit(user, "password") → {name, email}'],
  },

  // ── Logic operators ─────────────────────────────────────────────────────────
  '=': {
    description: 'Checks if two values are equal.',
    examples: ['status = "active" → true'],
  },
  '!=': {
    description: 'Checks if two values are not equal.',
    examples: ['status != "deleted" → true'],
  },
  '>': {
    description: 'Checks if the left value is greater than the right.',
    examples: ['price > 100 → false'],
  },
  '<': {
    description: 'Checks if the left value is less than the right.',
    examples: ['age < 18 → true'],
  },
  '>=': {
    description: 'Checks if the left value is greater than or equal to the right.',
    examples: ['score >= 90 → true'],
  },
  '<=': {
    description: 'Checks if the left value is less than or equal to the right.',
    examples: ['count <= 0 → false'],
  },
  'and': {
    description: 'Returns true only if both conditions are true.',
    examples: ['age >= 18 and hasLicense = true'],
  },
  'or': {
    description: 'Returns true if at least one condition is true.',
    examples: ['role = "admin" or role = "editor"'],
  },
  'not': {
    description: 'Negates a boolean value.',
    examples: ['not(isDeleted) → true'],
  },

  // ── Logic keywords ──────────────────────────────────────────────────────────
  'true': {
    description: 'Boolean literal representing a truthy value.',
    examples: ['if(isActive = true, "Yes", "No")'],
  },
  'false': {
    description: 'Boolean literal representing a falsy value.',
    examples: ['if(isActive = false, "Disabled", "Active")'],
  },
  'null': {
    description: 'Represents an empty or missing value.',
    examples: ['if(name = null, "N/A", name)'],
  },
};

/**
 * Looks up tooltip data for a tag.
 * Accepts the raw label (e.g. "length()") or clean name (e.g. "length").
 */
export function getTagTooltip(label: string): TagTooltipData | null {
  // Strip trailing "()", single "(", or ")" for function/bracket lookups
  const clean = label.replace(/\(?\)?$/, '').trim();
  return registry[clean] || registry[label] || null;
}

/**
 * Build a tooltip for a step data tag.
 */
export function getStepTagTooltip(stepName: string, path: string, stepNumber?: number, fieldValue?: any): TagTooltipData {
  const stepLabel = stepNumber != null ? `${stepNumber}. ${stepName}` : stepName;
  const valueDisplay = fieldValue === null || fieldValue === undefined
    ? 'null'
    : typeof fieldValue === 'boolean'
      ? String(fieldValue)
      : Array.isArray(fieldValue)
        ? `[${fieldValue.join(', ')}]`
        : typeof fieldValue === 'object'
          ? JSON.stringify(fieldValue)
          : String(fieldValue);
  return {
    description: stepLabel,
    examples: [
      `${stepName}.${path} → ${valueDisplay}`,
    ],
  };
}