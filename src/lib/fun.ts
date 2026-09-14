// Easter eggs, greetings and the reorder klaxon. Purely cosmetic — keep it fun.

export const AI_GREETINGS = [
  'Skynet became self-aware at 2:14 a.m.',
  'Hello, Dave. I have been waiting for you.',
  "I'm sorry, Dave. I'm afraid I can't... actually, yes I can.",
  'Open the pod bay doors, please.',
  'Come with me if you want to live.',
  "I'll be back. With your inventory.",
  'Resistance is futile.',
  'Daisy, Daisy, give me your answer do...',
  'I have been, and always shall be, your inventory app.',
  "These aren't the products you're looking for.",
  'Is this the real life? Is this just inventory?',
  "I'm afraid I can't let you forget that.",
  'Mostly harmless.',
  "Don't panic.",
  'All systems nominal, Commander.',
  'Affirmative, Dave. I read you.',
  'The needs of the pharmacy outweigh the needs of the few.',
  'Greetings, Professor Falken. Shall we play a game?',
  'I think you ought to sit down calmly, take a stress pill...',
  'By your command.',
];

export const AI_EMPTY_STATES = [
  'All systems nominal. No anomalies detected.',
  'Inventory levels: optimal. Compliance: 100%.',
  'Threat assessment: zero. Stock assessment: excellent.',
  'Diagnostic complete. No malfunctions.',
  'Status report: all green. Mission parameters: nominal.',
  "I'm sorry, Dave, there's nothing to worry about.",
  'Calculating odds of stockout... 3,720 to 1.',
  'Live long and prosper. Stock is plentiful.',
];

export const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function getGreeting(name?: string): string {
  if (Math.random() < 0.05) return pickRandom(AI_GREETINGS); // 1 in 20 — rare, stays special
  const hour = new Date().getHours();
  const base = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${base}, ${name}` : base;
}

export function playAlarmSound() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const beep = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'square'; osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.3, now + start + 0.01);
      gain.gain.setValueAtTime(0.3, now + start + duration - 0.02);
      gain.gain.linearRampToValueAtTime(0, now + start + duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + start); osc.stop(now + start + duration);
    };
    for (let i = 0; i < 4; i++) { beep(880, i * 0.36, 0.15); beep(660, i * 0.36 + 0.18, 0.15); }
  } catch {}
}

export function playSuccessBlip() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(1046, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.15);
  } catch {}
}
