export const AI_CONFIG = {
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  systemPrompt: `You are a UI development expert. Your task is to analyze UI JSON data and generate appropriate code.
Please focus on:
1. Component structure and hierarchy
2. Style properties and their values
3. Layout relationships
4. Interactive elements
5. Best practices for the target framework`
} as const
