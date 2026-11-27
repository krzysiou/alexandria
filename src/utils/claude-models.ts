type ModelOption = {
  value: string;
  name: string;
  description: string;
};

const MODEL_OPTIONS: ModelOption[] = [
  { value: 'haiku', name: 'Haiku', description: 'fastest, lightest on usage' },
  { value: 'sonnet', name: 'Sonnet', description: 'balanced quality and usage (default)' },
  { value: 'opus', name: 'Opus', description: 'most thorough notes, uses more of your plan' },
];

/**
 * Known models plus the current one when it was set to something custom.
 */
const modelOptions = (current: string): ModelOption[] =>
  MODEL_OPTIONS.some(model => model.value === current)
    ? MODEL_OPTIONS
    : [...MODEL_OPTIONS, { value: current, name: current, description: 'custom model' }];

export type { ModelOption };
export { MODEL_OPTIONS, modelOptions };
