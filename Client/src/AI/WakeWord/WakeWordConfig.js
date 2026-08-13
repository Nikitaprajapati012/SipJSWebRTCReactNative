/**
 * Client/src/AI/WakeWord/WakeWordConfig.js
 *
 * Configuration for the Hands-Free Wake Word Engine.
 * Supports "Hey Nova", "Hey Assistant", "Hey App", "Hello Assistant".
 */

export const WAKE_WORD_CONFIG = {
  // Primary trigger phrase and acceptable aliases (case-insensitive)
  primaryWakeWord: 'Hey Nova',
  wakeWords: [
    'hey nova',
    'nova',
    'hey assistant',
    'hey app',
    'hello assistant',
    'ok assistant',
  ],

  // Sensitivity thresholds (0.0 - 1.0)
  sensitivity: 0.75,

  // Audio parameters for processing
  sampleRate: 16000,
  frameLength: 512,

  // Continuous listening behavior
  autoRestartDelay: 500, // Ms delay before resuming wake word listening after session completion
  silenceTimeout: 5000,   // Ms silence before auto-timing out speech input

  // Audio feedback
  enableChime: true,
};

export default WAKE_WORD_CONFIG;
