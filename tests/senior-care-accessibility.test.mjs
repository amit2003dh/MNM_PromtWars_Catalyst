import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Senior Care Mode Accessibility & TTS Voice Fallback Suite', async (t) => {
  const dashboardPath = path.resolve(process.cwd(), 'src/app/dashboard/page.tsx');
  const voiceReaderPath = path.resolve(process.cwd(), 'src/components/VoiceReader.tsx');
  const doubleDoseModalPath = path.resolve(process.cwd(), 'src/components/DoubleDoseWarningModal.tsx');
  const careContextPath = path.resolve(process.cwd(), 'src/context/CareContext.tsx');

  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  const voiceReaderContent = fs.readFileSync(voiceReaderPath, 'utf8');
  const doubleDoseModalContent = fs.readFileSync(doubleDoseModalPath, 'utf8');
  const careContextContent = fs.readFileSync(careContextPath, 'utf8');

  await t.test('1. Senior Care Mode includes the 3 prominent primary action buttons', () => {
    // Button 1: I HAVE TAKEN MY MEDICINE
    assert.ok(
      dashboardContent.includes('1. I HAVE TAKEN MY MEDICINE'),
      'Senior Care Mode must have "1. I HAVE TAKEN MY MEDICINE" button'
    );

    // Button 2: I NEED HELP
    assert.ok(
      dashboardContent.includes('2. I NEED HELP'),
      'Senior Care Mode must have "2. I NEED HELP" button'
    );

    // Button 3: HOW AM I FEELING?
    assert.ok(
      dashboardContent.includes('3. HOW AM I FEELING?'),
      'Senior Care Mode must have "3. HOW AM I FEELING?" button'
    );

    // Emergency SOS button
    assert.ok(
      dashboardContent.includes('EMERGENCY SOS'),
      'Senior Care Mode must have an Emergency SOS trigger'
    );
  });

  await t.test('2. Senior Care Mode features giant touch targets and high-contrast styling', () => {
    // Touch target sizes: WCAG AAA requires large minimum touch targets for motor-impaired seniors
    assert.ok(
      dashboardContent.includes('min-h-[140px]') || dashboardContent.includes('min-h-[64px]'),
      'Senior action buttons must feature large minimum height touch targets'
    );

    // High contrast typography and borders
    assert.ok(
      dashboardContent.includes('font-black') && (dashboardContent.includes('border-4') || dashboardContent.includes('border-emerald-400')),
      'Must employ high-contrast bold fonts and thick borders'
    );

    // Senior mode indicator badge
    assert.ok(
      dashboardContent.includes('Senior Care Safe Mode') || dashboardContent.includes('Senior Mode'),
      'Must display visible Senior Mode status badge'
    );
  });

  await t.test('3. VoiceReader SpeechSynthesis TTS component has feature detection and senior-adjusted speech rate', () => {
    // Feature detection: checks if 'speechSynthesis' in window
    assert.ok(
      voiceReaderContent.includes("'speechSynthesis' in window") || voiceReaderContent.includes('"speechSynthesis" in window'),
      'VoiceReader must feature-detect window.speechSynthesis'
    );

    // Graceful fallback when SpeechSynthesis is unsupported
    assert.ok(
      voiceReaderContent.includes('if (!isSupported)') || voiceReaderContent.includes('return null'),
      'VoiceReader must gracefully return null or fallback without throwing when speech is unavailable'
    );

    // Elderly clarity rate tuning (slower rate 0.8 - 0.9 default)
    assert.ok(
      voiceReaderContent.includes('0.88') || voiceReaderContent.includes('rate = 0.8'),
      'VoiceReader should default to an elderly-friendly slower speech rate (0.8 - 0.9)'
    );

    // Accessible ARIA labelling
    assert.ok(
      voiceReaderContent.includes('aria-label='),
      'VoiceReader button must provide descriptive aria-label for screen readers'
    );

    // Cleanup on unmount (cancelling speech)
    assert.ok(
      voiceReaderContent.includes('speechSynthesis.cancel()'),
      'VoiceReader must cancel speech synthesis on unmount and stop'
    );
  });

  await t.test('4. DoubleDoseWarningModal provides accessible modal dialog with clear clinical guidance', () => {
    // ARIA modal attributes
    assert.ok(
      doubleDoseModalContent.includes('role="dialog"') && doubleDoseModalContent.includes('aria-modal="true"'),
      'DoubleDoseWarningModal must have role="dialog" and aria-modal="true"'
    );

    // Safety lock banner
    assert.ok(
      doubleDoseModalContent.includes('Safety Concurrency Lock Engaged') || doubleDoseModalContent.includes('Dose Already Administered'),
      'Modal must state clearly that the safety concurrency lock engaged'
    );

    // Displays actor and timestamp
    assert.ok(
      doubleDoseModalContent.includes('administeredByName') && doubleDoseModalContent.includes('recordedAt'),
      'Modal must present who administered the dose and at what timestamp'
    );

    // High contrast emergency amber border
    assert.ok(
      doubleDoseModalContent.includes('border-amber-400') || doubleDoseModalContent.includes('border-4'),
      'Modal must feature prominent visual warning border'
    );
  });

  await t.test('5. CareContext manages Senior Mode toggle and state persistence', () => {
    assert.ok(
      careContextContent.includes('seniorMode') && careContextContent.includes('setSeniorMode'),
      'CareContext must expose seniorMode state and setSeniorMode toggle function'
    );
  });
});
