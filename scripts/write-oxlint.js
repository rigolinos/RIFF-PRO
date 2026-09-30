import fs from 'fs';
const oxlintrc = {
  "plugins": ["react", "typescript"],
  "rules": {
    "react/only-export-components": "warn",
    "react/incompatible-library": "warn",
    "react/set-state-in-effect": "warn"
  },
  "overrides": [
    {
      "files": ["src/components/ui/**/*.tsx", "src/contexts/ViewModeContext.tsx", "src/hooks/use-mobile.tsx"],
      "rules": {
        "react/only-export-components": "off"
      }
    }
  ]
};
fs.writeFileSync('.oxlintrc.json', JSON.stringify(oxlintrc, null, 2));
