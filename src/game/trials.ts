import type { TrialModId } from './types';

export interface TrialModDef {
  id: TrialModId;
  name: string;
  tag: string;
  effectText: string;
  mfBonus: number;
  stoneBonusPct: number;
  expBonusPct: number;
}

export const TRIAL_MODS: TrialModDef[] = [
  {
    id: 'iron_foes',
    name: '鋼鉄の呪縛',
    tag: '敵HP+25%',
    effectText: '敵HP+25%・敵防御+12%',
    mfBonus: 30,
    stoneBonusPct: 25,
    expBonusPct: 20,
  },
  {
    id: 'drought',
    name: '枯渇の印',
    tag: '回復半減',
    effectText: '戦闘中の回復量-45%',
    mfBonus: 35,
    stoneBonusPct: 25,
    expBonusPct: 20,
  },
  {
    id: 'no_potions',
    name: '禁薬の戒め',
    tag: '秘薬禁止',
    effectText: '秘薬・霊薬が使用不可',
    mfBonus: 35,
    stoneBonusPct: 30,
    expBonusPct: 25,
  },
  {
    id: 'swift_foes',
    name: '疾風の威圧',
    tag: '敵先制',
    effectText: '敵素早さ+25%・敵火力+12%',
    mfBonus: 30,
    stoneBonusPct: 25,
    expBonusPct: 20,
  },
  {
    id: 'blood_boss',
    name: '修羅の刻印',
    tag: 'ボス狂暴',
    effectText: 'ボスが開幕から激昂',
    mfBonus: 45,
    stoneBonusPct: 35,
    expBonusPct: 30,
  },
];

export function computeTrialModifiers(activeTrials: TrialModId[] | undefined) {
  const set = new Set(activeTrials ?? []);
  let mfBonus = 0;
  let stoneBonusPct = 0;
  let expBonusPct = 0;
  for (const mod of TRIAL_MODS) {
    if (set.has(mod.id)) {
      mfBonus += mod.mfBonus;
      stoneBonusPct += mod.stoneBonusPct;
      expBonusPct += mod.expBonusPct;
    }
  }
  return {
    count: set.size,
    mfBonus,
    stoneBonusPct,
    expBonusPct,
    enemyHpMult: set.has('iron_foes') ? 1.25 : 1,
    enemyDefMult: set.has('iron_foes') ? 1.12 : 1,
    enemyAtkMult: set.has('swift_foes') ? 1.12 : 1,
    enemySpdMult: set.has('swift_foes') ? 1.25 : 1,
    healMult: set.has('drought') ? 0.55 : 1,
    noPotions: set.has('no_potions'),
    bossStartsEnraged: set.has('blood_boss'),
  };
}
