# App icon and splash sources

Generated from `mark.svg` (the Ficium mark, same paths as `FiciumLogo`).
White icon background, paper (#FAFAFC) splash background. Mark sized to stay
inside Android's adaptive-icon safe zone.

Regenerate the native sets after changing these files:

```sh
npx @capacitor/assets@3.0.5 generate --ios --android --assetPath resources \
  --iconBackgroundColor '#FFFFFF' --splashBackgroundColor '#FAFAFC'
```
