import { writeFileSync } from 'node:fs';
import { lessons } from '../src/lessons.js';
import { narrationClips } from '../src/narration-clips.js';

export function writeNarrationNotes(manifest) {
  const lines = [
    '# Narration scripts', '',
    `Generated voice: **${manifest.voice.model} · ${manifest.voice.id} · ${manifest.voice.language}**, speed ${manifest.voice.speed}.`, '',
    'These transcripts are the exact inputs used to generate the local audio. The application shows the same text.', '',
  ];
  for (const lesson of lessons) {
    lines.push(`## ${lesson.title}`, '');
    for (const [id, clip] of Object.entries(narrationClips[lesson.id])) {
      const recording = manifest.clips.find(item => item.lessonId === lesson.id && item.contextId === id);
      lines.push(`### ${clip.title} — ${recording.durationSeconds.toFixed(2)} seconds`, '',
        `ID: \`${lesson.id}/${id}\` · [Audio](../public/${clip.src})`, '', clip.transcript, '');
    }
  }
  writeFileSync(new URL('../docs/NARRATION_SCRIPTS.md', import.meta.url), lines.join('\n'));
}
