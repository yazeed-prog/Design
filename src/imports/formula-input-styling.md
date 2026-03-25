I want to improve the UI styling of my formula builder popover and the inline formula input field.

Current UI structure:

The popover contains items grouped into categories such as:

* Functions
* Operators
* Keywords

Examples:
Functions: floor, addHours, map, min, substring
Operators: +, -, *, /, mod, and, or, not, =, !=, >, <
Keywords: true, false, null, space, emptystring, newline

The formula input is a single-line editable field where users can insert these items.

The stored value is plain text. Example:
floor(addHours(x; 2) - 1)

I want the UI behavior to follow these rules:

---

1. Popover Color Rules

---

Color represents the TYPE of item.

All items of the same type must share the same color.

Example:

Functions → one consistent color (for example blue)
Operators → one consistent color (for example purple)
Keywords → one consistent color (for example yellow/orange)

Do NOT give different colors to individual functions.

Example in the popover:

Functions
blue floor
blue addHours
blue map
blue substring

Operators
purple +
purple -
purple and
purple or

Keywords
yellow true
yellow false
yellow null

---

2. Color Consistency Rule

---

The base color (hue) used in the popover must remain the same in the input field.

Example:

If a keyword is yellow in the popover, it must stay yellow in the input field.

If an operator is purple in the popover, it must stay purple in the input field.

If a function is blue in the popover, it must stay blue in the input field.

The base hue must NEVER change between popover and input field.

Only the SHADE of the color may change for nested functions.

---

3. Input Field Rendering

---

The formula input field is a single-line editable input.

Example text:
floor(addHours(x; 2) - 1)

In the input field:

Only the FUNCTION NAMES should be visually styled.

Examples:
floor
addHours
map
min

Parentheses must remain plain text:
(
)

Separators must remain plain text:
;
,

Operators must remain plain text:

* * * / > < =

Do NOT convert punctuation or operators into chips or tokens.

The input must remain editable like normal text.

---

4. Nested Function Visualization

---

When functions are nested inside other functions, the same base color must be used but the SHADE should change depending on nesting depth.

Example:

floor(addHours(x;2))

Rendering concept:

floor → blue-600 (depth 1)
addHours → blue-500 (depth 2)

If another function exists:

floor(map(addHours(x)))

floor → blue-600
map → blue-500
addHours → blue-400

Important rule:
The hue must stay the same. Only the shade changes.

---

5. Layout Constraints

---

This is NOT a code editor.

Everything must remain on a single line.

Do not create tokens or chips for parentheses, separators, or operators.

Use lightweight inline styling (for example spans) to style only the function names.

---

6. UX Goal

---

The goal is to:

* keep the formula easy to read
* clearly show nested functions
* maintain consistent colors between popover and input field
* avoid turning the input into a complex tokenized editor
