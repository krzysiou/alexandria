const config = {
  extends: ['stylelint-config-standard', 'stylelint-config-recess-order'],
  customSyntax: 'postcss-styled-syntax',
  rules: {
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'no-descending-specificity': null,
    'value-keyword-case': null,
    'property-no-vendor-prefix': null,
    'value-no-vendor-prefix': null,
  },
};

export default config;
