# Color tokens and OKLCH

This project uses CSS variables for colors. To improve perceptual contrast and make lightness adjustments consistent across the UI we now prefer OKLCH color values in modern browsers. The approach used:

- continue to define hex fallback variables in `:root` to preserve browser compatibility
- add an `@supports (color: oklch(...))` block that overrides `:root` variables with OKLCH values when the browser supports it
- prefer `--color-*` variables in components and styles rather than hard-coded hex values
- add `--text-on-*` helpers (e.g. `--text-on-success`, `--text-on-danger`) to guarantee readable text on top of soft backgrounds

If you need to add a new color token:

1. Add the hex fallback in `src/app/styles/main.css` under `:root`.
2. Add an OKLCH override inside the `@supports (color: oklch(...))` block to override the fallback.
3. Use the variable everywhere else and avoid hard-coded hex values.

Contrast and accessibility

- Colors chosen in the OKLCH block are tuned to keep the soft "kawaii" aesthetic, while providing stronger perceptual contrast for small text and UI elements.
- For foreground text on soft backgrounds prefer the `--text-on-*` tokens so the color is intentionally darker.
- If you want to verify contrast manually, use browser devtools or tools like "Accessible Colors".

Example:

```css
:root {
  --color-danger: #f87171; /* hex fallback */
  --text-on-danger: #5e1414; /* hex fallback for readable text */
}
@supports (color: oklch(0.5 0.01 100)) {
  :root {
    --color-danger: oklch(0.65 0.12 30);
    --text-on-danger: oklch(0.12 0 0);
  }
}

.error {
  background: var(--color-danger);
  color: var(--text-on-danger);
}
```
