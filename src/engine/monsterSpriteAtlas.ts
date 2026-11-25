import type { PixelGrid } from './hdSprites';

type BodyArchetype =
  | 'whale'
  | 'kraken'
  | 'mantis'
  | 'asura'
  | 'orrery'
  | 'beast'
  | 'avian'
  | 'serpent'
  | 'insect'
  | 'shell'
  | 'plant'
  | 'humanoid'
  | 'ghost'
  | 'fish'
  | 'object'
  | 'spider'
  | 'frog'
  | 'biped';

type FeaturePart =
  | 'none'
  | 'antlers'
  | 'bull_horns'
  | 'unicorn_horn'
  | 'tusks'
  | 'triple_head'
  | 'crown'
  | 'halo'
  | 'wings'
  | 'butterfly_wings'
  | 'claws'
  | 'stinger'
  | 'weapon_blade'
  | 'weapon_hammer'
  | 'staff'
  | 'shield'
  | 'book'
  | 'harp'
  | 'candle'
  | 'wheel'
  | 'orb_eye'
  | 'spikes'
  | 'shell_spiral'
  | 'mane'
  | 'plume'
  | 'lantern'
  | 'cape'
  | 'gears'
  | 'aura_fire'
  | 'aura_ice'
  | 'aura_star';

export interface MonsterSpriteRecipe {
  body: BodyArchetype;
  part1: FeaturePart;
  part2?: FeaturePart;
  primary: string;
  shade: string;
  light: string;
  accent: string;
  eye: string;
  outline?: string;
}

const R = (
  body: BodyArchetype,
  part1: FeaturePart,
  primary: string,
  shade: string,
  light: string,
  accent: string,
  eye: string,
  part2: FeaturePart = 'none',
): MonsterSpriteRecipe => ({
  body,
  part1,
  part2,
  primary,
  shade,
  light,
  accent,
  eye,
});

// Bespoke 32x32 8-frame pixel art recipes for every new monster (zero variants!)
export const MONSTER_SPRITE_RECIPES: Record<string, MonsterSpriteRecipe> = {
  // ===== NEW BOSSES =====
  glacier_leviathan: R('whale', 'crown', '#3e8fd4', '#1b4778', '#b5ecff', '#7cf2ff', '#ffe559', 'aura_ice'),
  abyss_kraken: R('kraken', 'crown', '#56399c', '#261754', '#a88cff', '#ff66a8', '#ffe866', 'aura_star'),
  chronos_mantis: R('mantis', 'gears', '#d6a93e', '#7d5714', '#fff0a8', '#6beeff', '#ff5268', 'aura_star'),
  asura_emperor: R('asura', 'aura_fire', '#d63a2f', '#731616', '#ff8c66', '#ffe059', '#ffffff', 'weapon_blade'),
  genesis_orrery: R('orrery', 'halo', '#f2c74b', '#8f6314', '#fff7c4', '#7ce8ff', '#ffffff', 'aura_star'),

  // ===== NEW ELITES =====
  stag_monarch: R('beast', 'antlers', '#7a5738', '#422c1a', '#ba926a', '#e8f5ff', '#7ce8ff', 'cape'),
  mandrake_queen: R('plant', 'crown', '#9c6e44', '#593b21', '#d9ad80', '#58c963', '#ff5e8a', 'plume'),
  horn_beetle_king: R('insect', 'unicorn_horn', '#d9a426', '#7d550e', '#ffe675', '#422c1a', '#6beeff', 'spikes'),
  dryad_oracle: R('humanoid', 'staff', '#54b86a', '#266b38', '#a8f7a6', '#ff8cb5', '#ffe866', 'plume'),
  emerald_basilisk: R('serpent', 'plume', '#3ca869', '#1b5938', '#8cf5a6', '#e64d5c', '#ffe859', 'wings'),
  gargoyle_warden: R('biped', 'wings', '#7b8499', '#424859', '#bcc5d9', '#6beeff', '#ff5768', 'bull_horns'),
  pharaoh_mummy: R('humanoid', 'crown', '#dfd2b0', '#968766', '#fff9e6', '#f2c144', '#6beeff', 'staff'),
  clockwork_centaur: R('beast', 'gears', '#b88346', '#69441e', '#f0c482', '#6beeff', '#ffe566', 'weapon_blade'),
  ifrit_djinn: R('ghost', 'bull_horns', '#e84c24', '#8c1c12', '#ffa64d', '#ffe559', '#ffffff', 'aura_fire'),
  obsidian_minotaur: R('biped', 'bull_horns', '#3a3447', '#1a1624', '#6c6480', '#ff6338', '#ffe059', 'weapon_hammer'),
  magma_hydra: R('serpent', 'triple_head', '#c93826', '#6e1410', '#ff8052', '#ffe059', '#fff5b8', 'aura_fire'),
  hellhound_cerberus: R('beast', 'triple_head', '#59292e', '#2b1116', '#9e4b52', '#ff7b24', '#ffe559', 'aura_fire'),
  beholder_tyrant: R('orrery', 'orb_eye', '#7d3eb8', '#3c1863', '#c48aff', '#ffe566', '#ff4763', 'aura_star'),
  nebula_manta: R('fish', 'wings', '#3f68c9', '#1b2f73', '#8cd4ff', '#ffe566', '#fff9d6', 'aura_star'),
  dullahan_rider: R('humanoid', 'cape', '#3d405c', '#1a1c2e', '#7b80a8', '#7ce8ff', '#a875ff', 'weapon_blade'),
  yeti_chieftain: R('biped', 'bull_horns', '#dceef7', '#7fa8c4', '#ffffff', '#69cfff', '#ff667a', 'aura_ice'),
  frost_valkyrie: R('humanoid', 'wings', '#c9ecff', '#568bbf', '#ffffff', '#7ce8ff', '#ffe566', 'weapon_blade'),
  mammoth_colossus: R('beast', 'tusks', '#826352', '#473329', '#b89480', '#b8f2ff', '#7ce8ff', 'aura_ice'),
  aurora_pegasus: R('beast', 'wings', '#e8f7ff', '#8ab4d9', '#ffffff', '#82ffdf', '#ffe566', 'halo'),
  blizzard_wendigo: R('biped', 'antlers', '#689bc4', '#2c4f73', '#c9eeff', '#ff5e7e', '#7cf2ff', 'claws'),
  solar_griffin: R('avian', 'mane', '#f0b83a', '#9c6614', '#fff09c', '#ffffff', '#6beeff', 'halo'),
  celestial_kirin: R('beast', 'unicorn_horn', '#ffe275', '#b8821c', '#ffffff', '#7ce8ff', '#4cb8ff', 'aura_star'),
  golden_anubis: R('humanoid', 'staff', '#2d3047', '#141524', '#5c6185', '#f5c749', '#6beeff', 'halo'),
  cherub_throne: R('orrery', 'wheel', '#f5c749', '#a87216', '#fff7cc', '#ff6e42', '#7ce8ff', 'orb_eye'),

  // ===== FOREST NORMALS =====
  cap_mushroom: R('plant', 'none', '#d94848', '#8c1f25', '#ff9494', '#fff5dc', '#241818', 'spikes'),
  dew_frog: R('frog', 'none', '#48b86e', '#236e41', '#9cf7ad', '#7ce8ff', '#ffe559'),
  pine_hedgehog: R('shell', 'spikes', '#875e3e', '#4f321e', '#bf916b', '#4ba854', '#1c1816'),
  clover_rabbit: R('beast', 'plume', '#f5f2e6', '#b8b09c', '#ffffff', '#58d46e', '#ff6688'),
  bark_turtle: R('shell', 'shell_spiral', '#6e4e34', '#3d291a', '#a37b58', '#52b858', '#ffe066'),
  nectar_bee: R('insect', 'stinger', '#f5c738', '#a87812', '#fff299', '#2b2218', '#5cc8ff', 'wings'),
  fern_chameleon: R('serpent', 'shell_spiral', '#4eb85c', '#246b34', '#9cf596', '#ffe059', '#ff5e5e'),
  bloom_alraune: R('plant', 'halo', '#f5cc38', '#b87f14', '#fff59c', '#4cb858', '#386e24'),
  amber_squirrel: R('beast', 'plume', '#d47936', '#874316', '#ffb675', '#ffe266', '#211814'),
  ivy_serpent: R('serpent', 'none', '#3ca652', '#1c5c2e', '#8cf296', '#c45cff', '#ffe559'),
  moss_snail: R('shell', 'shell_spiral', '#7aa852', '#3f6327', '#bef08a', '#b88856', '#241e18'),
  bambo_tanuki: R('biped', 'plume', '#8f6948', '#4f3622', '#c7a07d', '#58ba56', '#241a14'),
  canopy_monkey: R('biped', 'none', '#a8643b', '#5e321a', '#e09a6c', '#f5d2a6', '#211612', 'claws'),
  pollen_moth: R('insect', 'butterfly_wings', '#e8d084', '#9e803b', '#fff9d6', '#c975ff', '#3b2447'),
  root_badger: R('beast', 'claws', '#5e5a66', '#2e2b36', '#9a94a6', '#e6e0d5', '#ff9447'),

  // ===== RUINS NORMALS =====
  rattle_skeleton: R('humanoid', 'weapon_blade', '#ebe5d5', '#9c9586', '#ffffff', '#637185', '#ff5268'),
  clay_terracotta: R('humanoid', 'shield', '#b86843', '#6e361e', '#e69b75', '#f2c74b', '#6beeff'),
  dust_scarab: R('insect', 'crown', '#e8b636', '#8f6410', '#fff099', '#52d6ff', '#211810'),
  crypt_spider: R('spider', 'none', '#4a435c', '#221e2e', '#7e7599', '#a3ff80', '#ff4763'),
  cursed_grimoire: R('object', 'book', '#6a3d8f', '#361a52', '#b27be0', '#ffe566', '#7ce8ff', 'aura_star'),
  rust_automaton: R('biped', 'gears', '#a36643', '#5c331d', '#d69972', '#7ce8ff', '#ffe559'),
  sand_scorpion: R('spider', 'stinger', '#cfa15d', '#7d5929', '#fae0a8', '#c95cff', '#ff4759', 'claws'),
  marble_bust: R('object', 'crown', '#dce2eb', '#8c96a8', '#ffffff', '#6beeff', '#7cf2ff'),
  lantern_wisp: R('ghost', 'lantern', '#5ce0ff', '#277ba8', '#e0fbff', '#ff9436', '#ffffff'),
  tomb_jackal: R('beast', 'none', '#5c5246', '#2e2720', '#968878', '#f2c144', '#ffe559'),
  bronze_candelabra: R('object', 'candle', '#b88246', '#69451d', '#f0c282', '#ff8526', '#ffe86b'),
  mosaic_lizard: R('serpent', 'spikes', '#4b9ec9', '#235678', '#9ee6ff', '#f2c144', '#ff6347'),
  relic_urn: R('object', 'shell_spiral', '#9c6e4b', '#543721', '#d6a57c', '#c46bff', '#ffe559'),
  obelisk_eye: R('object', 'orb_eye', '#69748a', '#353b4a', '#a9b5cc', '#6beeff', '#ffe559'),
  cobweb_rat: R('beast', 'none', '#857d8f', '#4a4454', '#bfb8c9', '#f5b8c8', '#ff5268'),

  // ===== VOLCANO NORMALS =====
  cinder_salamander: R('serpent', 'aura_fire', '#e65529', '#8a2210', '#ff9b59', '#ffe559', '#ffffff'),
  sulfur_vulture: R('avian', 'plume', '#786c48', '#403822', '#b8aa7a', '#d9d448', '#ff5738'),
  coal_mole: R('beast', 'claws', '#423c42', '#1d1a1f', '#756b75', '#ff7b24', '#ffe059'),
  flare_centipede: R('serpent', 'spikes', '#d43b24', '#751810', '#ff8252', '#ffe059', '#ffffff'),
  basalt_rhino: R('beast', 'unicorn_horn', '#595461', '#2c2833', '#8e8899', '#ff742e', '#ffe059'),
  ember_locust: R('insect', 'wings', '#d95826', '#7d2810', '#ff9a5c', '#ffe566', '#ffffff'),
  lava_eel: R('serpent', 'aura_fire', '#eb4b1e', '#851d0e', '#ff9947', '#ffe86b', '#ffffff'),
  smoke_hyena: R('beast', 'mane', '#5c555c', '#2c282e', '#948b94', '#ff6338', '#ffe559'),
  forge_goblin: R('humanoid', 'weapon_hammer', '#5e964b', '#2e5724', '#9ce07e', '#ff8526', '#ffe559'),
  ash_armadillo: R('shell', 'spikes', '#857775', '#473e3d', '#bfb0ad', '#ff7b24', '#ffe559'),
  flame_bomb: R('orrery', 'aura_fire', '#e84824', '#8f1b10', '#ff9647', '#ffe86b', '#ffffff', 'candle'),
  cinder_iguana: R('serpent', 'spikes', '#bf4526', '#691d10', '#fa895c', '#ffcf47', '#ffe86b'),
  magma_ant: R('insect', 'claws', '#c93824', '#6e1610', '#ff7e57', '#ffe059', '#ffffff'),
  volcano_ram: R('beast', 'bull_horns', '#a8442a', '#5c1e12', '#e8825c', '#ffe059', '#fff5b8'),
  blazing_crow: R('avian', 'aura_fire', '#332d3b', '#16131c', '#635970', '#ff7326', '#ffe559'),
  soot_weasel: R('beast', 'aura_fire', '#635863', '#2e2830', '#9c909c', '#ff8a36', '#ffe566'),

  // ===== ABYSS NORMALS =====
  astral_nautilus: R('shell', 'shell_spiral', '#4d6fd6', '#21367d', '#99c4ff', '#ffe566', '#7ce8ff'),
  comet_seahorse: R('fish', 'aura_star', '#58b8ff', '#245ea8', '#c4f2ff', '#ffe566', '#ffffff'),
  cosmos_butterfly: R('insect', 'butterfly_wings', '#6c5ce8', '#312380', '#b8a8ff', '#7ce8ff', '#ffe566'),
  eclipse_cat: R('beast', 'aura_star', '#383059', '#19142e', '#6d629c', '#ffe566', '#7ce8ff'),
  gravity_urchin: R('orrery', 'spikes', '#523b8f', '#24174a', '#9c7ee0', '#7ce8ff', '#ffe566'),
  phantom_jester: R('humanoid', 'crown', '#8246c9', '#3f1c73', '#c794ff', '#ffe566', '#7ce8ff', 'cape'),
  mirror_wraith: R('ghost', 'shield', '#99c8e8', '#4a7094', '#ebfbff', '#c78aff', '#ffffff'),
  starlight_firefly: R('insect', 'lantern', '#4e6ec9', '#213578', '#9ec4ff', '#ffe86b', '#ffffff', 'wings'),
  cosmic_dragonfly: R('insect', 'wings', '#4cc4e8', '#1e698f', '#b5f4ff', '#d48aff', '#ffe566'),
  prism_starfish: R('orrery', 'aura_star', '#e875b8', '#8f306b', '#ffc4e6', '#7ce8ff', '#ffe566'),
  shadow_panther: R('beast', 'claws', '#2c2742', '#131021', '#5a527a', '#b875ff', '#7ce8ff'),
  night_peacock: R('avian', 'plume', '#3658b5', '#172863', '#7ea8ff', '#7ce8ff', '#ffe566'),
  nebula_angler: R('fish', 'lantern', '#364680', '#182045', '#6e86c7', '#ffe86b', '#ff5775'),
  astral_hermit: R('shell', 'claws', '#69529e', '#342459', '#ad94e6', '#7ce8ff', '#ffe566'),
  dark_marionette: R('humanoid', 'aura_star', '#7d548f', '#3d224a', '#bd8fd1', '#ff7096', '#ffe566'),
  chrono_chinchilla: R('beast', 'aura_star', '#b8c4e0', '#687494', '#edf2ff', '#ffe566', '#6beeff'),

  // ===== GLACIER NORMALS =====
  ice_penguin: R('avian', 'crown', '#32405e', '#171f33', '#667aa6', '#ffffff', '#ffe559'),
  glacier_walrus: R('whale', 'tusks', '#8094ad', '#44546b', '#bdd0e6', '#ffffff', '#6beeff'),
  snow_seal: R('whale', 'none', '#e8f5ff', '#9ec0d9', '#ffffff', '#7ce8ff', '#1c2436'),
  polar_bear: R('biped', 'claws', '#eaf6ff', '#9ab8cf', '#ffffff', '#7ce8ff', '#1b2233'),
  frost_narwhal: R('whale', 'unicorn_horn', '#72b8e8', '#336796', '#ccf2ff', '#fff0a6', '#1c273b'),
  glacier_muskox: R('beast', 'bull_horns', '#695d6e', '#352e3b', '#a395ab', '#b8f0ff', '#7ce8ff'),
  arctic_lynx: R('beast', 'claws', '#d6e9f5', '#7da2bd', '#ffffff', '#6beeff', '#5ce8ff'),
  frost_otter: R('beast', 'none', '#7d9db8', '#405a73', '#c2dff5', '#9cf2ff', '#1b2433'),
  blizzard_albatross: R('avian', 'wings', '#eef8ff', '#92b4cf', '#ffffff', '#7ce8ff', '#ffe559'),
  permafrost_lobster: R('spider', 'claws', '#4298cc', '#1d5380', '#9ee6ff', '#ffffff', '#ffe559'),
  hail_puffin: R('avian', 'none', '#2e384f', '#141929', '#5c6b8c', '#ff8838', '#7ce8ff'),
  glacier_ibex: R('beast', 'bull_horns', '#a8bfd4', '#58718a', '#e6f5ff', '#7ce8ff', '#ffe559'),
  frost_snowman: R('object', 'crown', '#ebf7ff', '#99bed9', '#ffffff', '#ff5768', '#1b2436', 'aura_ice'),
  aurora_clione: R('ghost', 'wings', '#b8f2ff', '#58a8d4', '#ffffff', '#ff8cc8', '#ffe566'),
  tundra_wolverine: R('beast', 'claws', '#5e4b47', '#2e2220', '#997f79', '#b8e8ff', '#ffe559'),
  snow_crane: R('avian', 'plume', '#f5fbff', '#a3bdd1', '#ffffff', '#ff4d63', '#ffe559'),
  frost_stoat: R('beast', 'none', '#f0f8ff', '#a3bed4', '#ffffff', '#384663', '#6beeff'),
  rime_spirit_bell: R('object', 'halo', '#8cdfff', '#3b82b8', '#ebfcff', '#ffe875', '#ffffff', 'aura_ice'),

  // ===== SANCTUM NORMALS =====
  sun_lion: R('beast', 'mane', '#f2b838', '#a36812', '#fff099', '#ff7b24', '#6beeff'),
  holy_unicorn: R('beast', 'unicorn_horn', '#fffaf0', '#c7baa3', '#ffffff', '#ffe566', '#6beeff', 'halo'),
  gilded_swan: R('avian', 'halo', '#fff4cc', '#c7a44a', '#ffffff', '#ffe059', '#5cc8ff'),
  ivory_camel: R('beast', 'crown', '#e8d09e', '#9c7f4a', '#fff5d6', '#e05848', '#2b2016'),
  radiant_dove: R('avian', 'halo', '#ffffff', '#b8c8db', '#ffffff', '#ffe566', '#4cb8ff'),
  halo_gazelle: R('beast', 'antlers', '#e8be6b', '#966c26', '#fff0bd', '#ffe566', '#6beeff'),
  sanctum_flamingo: R('avian', 'plume', '#ff789c', '#b8355c', '#ffc4d4', '#ffe566', '#6beeff'),
  sun_meerkat: R('biped', 'halo', '#dba863', '#8c5e27', '#ffe2ab', '#ffe566', '#241a12'),
  brass_harp: R('object', 'harp', '#f2c74b', '#9c6c14', '#fff5b8', '#7ce8ff', '#ffffff', 'halo'),
  sacred_ibis: R('avian', 'crown', '#f5f0e0', '#a69d88', '#ffffff', '#f2c144', '#6beeff'),
  gilded_pangolin: R('shell', 'spikes', '#e6b23c', '#8f6012', '#ffeb94', '#fff5cc', '#291c0d'),
  prism_cicada: R('insect', 'butterfly_wings', '#8ce8ff', '#3b8bbf', '#ebfcff', '#ff9ce6', '#ffe566'),
  sacred_alpaca: R('beast', 'halo', '#fff5dc', '#bfae8e', '#ffffff', '#ffe066', '#2b2016'),
  radiant_ladybug: R('shell', 'halo', '#eb4b4b', '#941c24', '#ff9494', '#ffe566', '#1c1816'),
  halo_bellflower: R('plant', 'halo', '#b5d6ff', '#5882c7', '#f0f7ff', '#ffe566', '#48b8ff'),
  marble_hippo: R('beast', 'crown', '#d9dce6', '#83899e', '#ffffff', '#f5c749', '#6beeff'),
  gilded_falcon: R('avian', 'crown', '#ebb338', '#965e10', '#fff09c', '#ffffff', '#6beeff'),
  celestial_okapi: R('beast', 'halo', '#9e5a44', '#572a1d', '#d99177', '#fff5dc', '#ffe566'),
};

function drawFeaturePart(
  g: PixelGrid,
  part: FeaturePart,
  phase: number,
  r: MonsterSpriteRecipe,
  headY: number,
  bodyY: number,
): void {
  const sway = Math.round(Math.sin(phase) * 1.5);
  const flap = Math.round(Math.sin(phase) * 3);

  switch (part) {
    case 'none':
      return;
    case 'antlers':
      g.line(11, headY - 3, 6, headY - 10 + sway, r.accent, 2);
      g.line(8, headY - 7, 5, headY - 5, r.accent, 1);
      g.line(20, headY - 3, 25, headY - 10 - sway, r.accent, 2);
      g.line(23, headY - 7, 26, headY - 5, r.accent, 1);
      break;
    case 'bull_horns':
      g.line(10, headY - 2, 5, headY - 6 + sway, r.accent, 2);
      g.line(5, headY - 6 + sway, 7, headY - 10, r.light, 1);
      g.line(21, headY - 2, 26, headY - 6 - sway, r.accent, 2);
      g.line(26, headY - 6 - sway, 24, headY - 10, r.light, 1);
      break;
    case 'unicorn_horn':
      g.line(15.5, headY - 3, 15.5 + sway, headY - 11, r.accent, 2);
      g.px(15.5 + sway, headY - 11, '#ffffff');
      break;
    case 'tusks':
      g.line(10, headY + 3, 6, headY + 7 + sway, '#fff8e6', 2);
      g.line(21, headY + 3, 25, headY + 7 - sway, '#fff8e6', 2);
      break;
    case 'triple_head':
      g.ellipse(8, headY + 1 + sway, 3.8, 3.2, r.primary, r.shade, r.light);
      g.px(7, headY + sway, r.eye);
      g.ellipse(23, headY + 1 - sway, 3.8, 3.2, r.primary, r.shade, r.light);
      g.px(24, headY - sway, r.eye);
      break;
    case 'crown':
      g.rect(11, headY - 6, 9, 2, '#f5c749');
      g.px(11, headY - 8, '#fff5b8');
      g.px(15, headY - 9, '#fff5b8');
      g.px(19, headY - 8, '#fff5b8');
      break;
    case 'halo':
      g.rect(11, headY - 8 + Math.round(Math.sin(phase)), 10, 2, '#ffe566');
      g.px(15, headY - 8 + Math.round(Math.sin(phase)), '#ffffff');
      break;
    case 'wings':
      g.line(9, bodyY, 2, bodyY - 6 + flap, r.light, 3);
      g.line(22, bodyY, 29, bodyY - 6 + flap, r.light, 3);
      g.line(9, bodyY + 2, 4, bodyY + 4 - flap, r.accent, 2);
      g.line(22, bodyY + 2, 27, bodyY + 4 - flap, r.accent, 2);
      break;
    case 'butterfly_wings':
      g.ellipse(7, bodyY - 2 + flap, 5.5, 4.5, r.primary, r.shade, r.accent);
      g.ellipse(24, bodyY - 2 + flap, 5.5, 4.5, r.primary, r.shade, r.accent);
      g.ellipse(8, bodyY + 4 - flap, 4, 3.2, r.accent, r.shade, r.light);
      g.ellipse(23, bodyY + 4 - flap, 4, 3.2, r.accent, r.shade, r.light);
      break;
    case 'claws':
      g.line(6, bodyY + 3, 3, bodyY + 7 + sway, r.light, 2);
      g.line(25, bodyY + 3, 28, bodyY + 7 - sway, r.light, 2);
      break;
    case 'stinger':
      g.line(23, bodyY + 2, 28, bodyY - 5 + sway, r.accent, 2);
      g.px(28, bodyY - 6 + sway, '#ffffff');
      break;
    case 'weapon_blade':
      g.line(24, bodyY + 3, 29, bodyY - 8 + sway, r.light, 2);
      g.rect(22, bodyY + 1, 5, 2, r.accent);
      break;
    case 'weapon_hammer':
      g.line(23, bodyY + 4, 27, bodyY - 6 + sway, '#7d4d2a', 2);
      g.rect(23, bodyY - 9 + sway, 7, 4, r.accent);
      break;
    case 'staff':
      g.line(24, bodyY + 7, 26, bodyY - 8 + sway, '#8c5a32', 2);
      g.ellipse(26, bodyY - 9 + sway, 2.5, 2.5, r.accent, r.shade, '#ffffff');
      break;
    case 'shield':
      g.rect(4, bodyY - 2, 5, 8, r.accent);
      g.rect(5, bodyY - 1, 3, 6, r.light);
      break;
    case 'book':
      g.rect(7, bodyY - 5, 18, 12, r.primary);
      g.rect(9, bodyY - 3, 14, 8, '#fff7e0');
      g.line(16, bodyY - 5, 16, bodyY + 7, r.accent, 2);
      break;
    case 'harp':
      g.line(9, bodyY - 8, 9, bodyY + 7, r.primary, 2);
      g.line(9, bodyY - 8, 22, bodyY - 3, r.primary, 2);
      g.line(22, bodyY - 3, 13, bodyY + 7, r.primary, 2);
      g.line(13, bodyY - 5, 13, bodyY + 5, r.accent, 1);
      g.line(16, bodyY - 4, 16, bodyY + 4, r.accent, 1);
      g.line(19, bodyY - 3, 19, bodyY + 2, r.accent, 1);
      break;
    case 'candle':
      g.rect(14, headY - 8, 3, 5, '#fff5dc');
      g.px(15, headY - 10 + (sway > 0 ? 1 : 0), '#ff7b24');
      g.px(15, headY - 9, '#ffe86b');
      break;
    case 'wheel':
      for (let i = 0; i < 12; i += 1) {
        const a = phase + (i / 12) * Math.PI * 2;
        g.px(15.5 + Math.cos(a) * 11, bodyY + Math.sin(a) * 11, i % 2 === 0 ? r.primary : r.light);
      }
      break;
    case 'orb_eye':
      g.ellipse(15.5, bodyY, 4.2, 4.2, '#ffffff', '#d0d8e8');
      g.ellipse(15.5 + sway * 0.5, bodyY, 2.2, 2.2, r.eye);
      g.px(15 + sway * 0.5, bodyY - 1, '#ffffff');
      break;
    case 'spikes':
      g.px(10, bodyY - 7, r.accent);
      g.px(15, bodyY - 8, r.accent);
      g.px(20, bodyY - 7, r.accent);
      break;
    case 'shell_spiral':
      g.ellipse(15.5, bodyY, 6, 5, r.accent, r.shade, r.light);
      g.ellipse(15.5, bodyY, 2.6, 2.2, r.shade);
      break;
    case 'mane':
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2;
        g.rect(14 + Math.cos(a) * 6, headY + Math.sin(a) * 5, 3, 3, r.accent);
      }
      break;
    case 'plume':
      g.line(21, bodyY + 1, 27, bodyY - 5 + sway, r.accent, 3);
      g.px(27, bodyY - 6 + sway, r.light);
      break;
    case 'lantern':
      g.line(18, headY - 4, 24, headY - 6 + sway, r.accent, 1);
      g.ellipse(25, headY - 4 + sway, 2.4, 2.6, '#ffe86b', '#ff8a24', '#ffffff');
      break;
    case 'cape':
      g.rect(8, bodyY - 1, 15, 10, r.shade);
      g.rect(10, bodyY, 11, 8, r.accent);
      break;
    case 'gears':
      g.ellipse(25, bodyY - 3, 3.2, 3.2, r.accent, r.shade, r.light);
      g.px(25 + Math.round(Math.cos(phase) * 3), bodyY - 3 + Math.round(Math.sin(phase) * 3), '#ffffff');
      break;
    case 'aura_fire':
      g.px(6, bodyY - 5 + sway, '#ff7b24');
      g.px(25, bodyY - 6 - sway, '#ffe86b');
      g.px(15, headY - 9 + sway, '#ff5226');
      break;
    case 'aura_ice':
      g.px(6, bodyY - 5 + sway, '#7ce8ff');
      g.px(25, bodyY - 5 - sway, '#ffffff');
      g.px(15, headY - 9 + sway, '#a8f4ff');
      break;
    case 'aura_star':
      g.px(5, bodyY - 6 + sway, '#ffe86b');
      g.px(26, bodyY - 4 - sway, '#7ce8ff');
      g.px(16, headY - 10 + sway, '#ffffff');
      break;
  }
}

export function paintAtlasMonster(g: PixelGrid, key: string, phase: number): boolean {
  const r = MONSTER_SPRITE_RECIPES[key];
  if (!r) return false;

  const bob = Math.round(Math.sin(phase) * 1.5);
  const stride = Math.round(Math.sin(phase) * 2);
  const flap = Math.round(Math.sin(phase) * 3);
  const outline = r.outline ?? '#181524';

  let headY = 12 + bob;
  let bodyY = 17 + bob;

  switch (r.body) {
    case 'whale': {
      bodyY = 16 + bob;
      headY = 14 + bob;
      g.ellipse(14, bodyY, 9.5, 6.2, r.primary, r.shade, r.light);
      g.ellipse(13, bodyY + 3, 7, 2.8, r.light);
      // Tail fin
      g.line(22, bodyY, 28, bodyY - 4 + flap * 0.6, r.primary, 3);
      g.line(22, bodyY, 28, bodyY + 4 + flap * 0.6, r.shade, 2);
      // Eyes
      g.rect(8, bodyY - 1, 2, 2, r.eye);
      g.px(8, bodyY - 1, '#ffffff');
      break;
    }
    case 'kraken': {
      bodyY = 13 + bob;
      headY = 10 + bob;
      for (let t = 0; t < 5; t += 1) {
        const bx = 7 + t * 4.2;
        for (let i = 0; i < 11; i += 1) {
          const tx = bx + Math.sin(phase + t * 1.1 - i * 0.45) * 2;
          g.px(tx, 17 + i, i % 3 === 0 ? r.accent : r.primary);
          g.px(tx + 1, 17 + i, r.shade);
        }
      }
      g.ellipse(15.5, bodyY, 8.2, 7.2, r.primary, r.shade, r.light);
      g.rect(11, bodyY + 1, 3, 2, r.eye);
      g.rect(18, bodyY + 1, 3, 2, r.eye);
      break;
    }
    case 'mantis': {
      bodyY = 16 + bob;
      headY = 10 + bob;
      g.line(12, 20, 8 + stride, 27, r.shade, 2);
      g.line(19, 20, 23 - stride, 27, r.shade, 2);
      g.ellipse(16, 19 + bob, 6, 4.5, r.primary, r.shade, r.light);
      g.ellipse(14, headY, 4.5, 4, r.primary, r.shade, r.light);
      // Scythe arms
      g.line(11, 14 + bob, 4, 11 + flap * 0.6, r.light, 2);
      g.line(4, 11 + flap * 0.6, 6, 18 + flap * 0.6, r.accent, 2);
      g.line(18, 14 + bob, 26, 11 - flap * 0.6, r.light, 2);
      g.line(26, 11 - flap * 0.6, 24, 18 - flap * 0.6, r.accent, 2);
      g.rect(11, headY - 1, 2, 2, r.eye);
      g.rect(15, headY - 1, 2, 2, r.eye);
      break;
    }
    case 'asura': {
      bodyY = 16 + bob;
      headY = 9 + bob;
      // 6 blazing arms!
      for (let a = 0; a < 3; a += 1) {
        const ay = 13 + a * 3 + bob;
        g.line(10, ay, 3, ay - 3 + a * 2 + Math.round(Math.sin(phase + a) * 1.5), r.primary, 2);
        g.line(21, ay, 28, ay - 3 + a * 2 - Math.round(Math.sin(phase + a) * 1.5), r.primary, 2);
      }
      g.rect(11, 13 + bob, 10, 12, r.primary);
      g.rect(13, 15 + bob, 6, 8, r.accent);
      g.ellipse(16, headY, 4.8, 4.5, r.primary, r.shade, r.light);
      g.rect(13, headY - 1, 2, 2, r.eye);
      g.rect(17, headY - 1, 2, 2, r.eye);
      g.px(15, headY - 3, '#ffe559');
      g.rect(12, 24, 3, 4, r.shade);
      g.rect(17, 24, 3, 4, r.shade);
      break;
    }
    case 'orrery': {
      bodyY = 16 + bob;
      headY = 13 + bob;
      for (let i = 0; i < 14; i += 1) {
        const ang = phase + (i / 14) * Math.PI * 2;
        if (Math.sin(ang) < 0) {
          g.px(15.5 + Math.cos(ang) * 12, bodyY + Math.sin(ang) * 4.5, r.accent);
        }
      }
      g.ellipse(15.5, bodyY, 7.2, 7.2, r.primary, r.shade, r.light);
      g.rect(12, bodyY - 1, 2, 2, r.eye);
      g.rect(18, bodyY - 1, 2, 2, r.eye);
      for (let i = 0; i < 14; i += 1) {
        const ang = phase + (i / 14) * Math.PI * 2;
        if (Math.sin(ang) >= 0) {
          g.rect(15.5 + Math.cos(ang) * 12, bodyY + Math.sin(ang) * 4.5, 2, 1, r.light);
        }
      }
      break;
    }
    case 'beast': {
      bodyY = 19 + bob;
      headY = 13 + bob;
      g.rect(9 + stride, 22, 3, 5, r.shade);
      g.rect(19 - stride, 22, 3, 5, r.shade);
      g.rect(12 - stride, 23, 3, 4, r.primary);
      g.rect(17 + stride, 23, 3, 4, r.primary);
      g.ellipse(16, bodyY, 8.2, 5.2, r.primary, r.shade, r.light);
      g.ellipse(10.5, headY, 5.2, 4.5, r.primary, r.shade, r.light);
      g.rect(8, headY - 5, 2, 3, r.accent);
      g.rect(12, headY - 5, 2, 3, r.accent);
      g.rect(8, headY - 1, 2, 2, r.eye);
      g.px(8, headY - 1, '#ffffff');
      g.line(23, bodyY - 1, 27, bodyY - 4 + stride, r.accent, 2);
      break;
    }
    case 'avian': {
      bodyY = 17 + bob;
      headY = 11 + bob;
      g.line(10, bodyY, 3, bodyY - 5 + flap, r.primary, 3);
      g.line(21, bodyY, 28, bodyY - 5 + flap, r.primary, 3);
      g.ellipse(15.5, bodyY, 6.2, 6.8, r.primary, r.shade, r.light);
      g.ellipse(15.5, headY, 4.5, 4.2, r.primary, r.shade, r.light);
      g.rect(11, headY, 3, 2, '#ffae38'); // Beak
      g.rect(14, headY - 1, 2, 2, r.eye);
      g.line(13, 23, 12, 27, '#d99824', 2);
      g.line(18, 23, 19, 27, '#d99824', 2);
      break;
    }
    case 'serpent': {
      bodyY = 18 + bob;
      headY = 11 + bob;
      for (let i = 0; i < 16; i += 1) {
        const sx = 9 + i * 1.1;
        const sy = 21 - Math.sin(phase + i * 0.45) * 3.5;
        g.ellipse(sx, sy, 2.8, 2.5, i % 3 === 0 ? r.accent : r.primary, r.shade, r.light);
      }
      g.ellipse(11, headY + 2, 5.2, 4.2, r.primary, r.shade, r.light);
      g.rect(8, headY + 1, 2, 2, r.eye);
      g.rect(12, headY + 1, 2, 2, r.eye);
      break;
    }
    case 'insect': {
      bodyY = 17 + bob;
      headY = 12 + bob;
      g.line(10, bodyY + 2, 6 + stride, 25, r.shade, 1);
      g.line(15, bodyY + 3, 15 - stride, 26, r.shade, 1);
      g.line(21, bodyY + 2, 25 + stride, 25, r.shade, 1);
      g.ellipse(16, bodyY, 7.2, 5.2, r.primary, r.shade, r.light);
      g.ellipse(11, headY + 2, 4.2, 3.8, r.shade, r.shade, r.primary);
      g.rect(9, headY + 1, 2, 2, r.eye);
      g.line(9, headY - 1, 6, headY - 5 + stride, r.accent, 1);
      g.line(12, headY - 1, 10, headY - 5 - stride, r.accent, 1);
      break;
    }
    case 'shell': {
      bodyY = 18 + bob;
      headY = 18 + bob;
      g.ellipse(16.5, bodyY - 1, 8.2, 6.8, r.primary, r.shade, r.light);
      g.ellipse(9, bodyY + 2, 4.2, 3.5, r.light, r.shade);
      g.rect(7, bodyY + 1, 2, 2, r.eye);
      g.rect(11 + stride, 24, 3, 3, r.shade);
      g.rect(18 - stride, 24, 3, 3, r.shade);
      break;
    }
    case 'plant': {
      bodyY = 18 + bob;
      headY = 11 + bob;
      g.rect(12, 18, 8, 9, r.shade);
      g.rect(13, 19, 6, 7, r.primary);
      g.ellipse(16, headY + 2, 7.5, 5.5, r.primary, r.shade, r.light);
      g.rect(12, bodyY + 1, 2, 2, r.eye);
      g.rect(18, bodyY + 1, 2, 2, r.eye);
      break;
    }
    case 'humanoid': {
      bodyY = 17 + bob;
      headY = 10 + bob;
      g.rect(11, 14 + bob, 10, 10, r.primary);
      g.rect(13, 15 + bob, 6, 7, r.accent);
      g.ellipse(16, headY, 4.6, 4.4, r.light, r.shade, '#ffffff');
      g.rect(13, headY - 1, 2, 2, r.eye);
      g.rect(17, headY - 1, 2, 2, r.eye);
      g.rect(12 + stride * 0.5, 24, 3, 4, r.shade);
      g.rect(17 - stride * 0.5, 24, 3, 4, r.shade);
      break;
    }
    case 'ghost': {
      bodyY = 15 + bob;
      headY = 12 + bob;
      for (let t = 0; t < 4; t += 1) {
        g.rect(10 + t * 3, 21 + bob + ((t + Math.floor(phase)) % 2) * 2, 2, 4, r.shade);
      }
      g.ellipse(15.5, bodyY, 7.2, 8, r.primary, r.shade, r.light);
      g.rect(12, headY + 1, 2, 3, r.eye);
      g.rect(18, headY + 1, 2, 3, r.eye);
      break;
    }
    case 'fish': {
      bodyY = 16 + bob;
      headY = 15 + bob;
      g.ellipse(14.5, bodyY, 8.2, 5.2, r.primary, r.shade, r.light);
      g.line(21, bodyY, 27, bodyY - 5 + flap * 0.6, r.accent, 3);
      g.line(21, bodyY, 27, bodyY + 5 + flap * 0.6, r.accent, 3);
      g.rect(9, bodyY - 1, 2, 2, r.eye);
      break;
    }
    case 'object': {
      bodyY = 16 + bob;
      headY = 12 + bob;
      g.rect(9, 10 + bob, 14, 14, r.primary);
      g.rect(11, 12 + bob, 10, 10, r.light);
      g.rect(12, 15 + bob, 2, 2, r.eye);
      g.rect(18, 15 + bob, 2, 2, r.eye);
      break;
    }
    case 'spider': {
      bodyY = 18 + bob;
      headY = 17 + bob;
      for (let i = 0; i < 3; i += 1) {
        const yOff = 15 + i * 3;
        g.line(10, yOff, 3, yOff + 4 + (i % 2 === 0 ? stride : -stride), r.shade, 1);
        g.line(21, yOff, 28, yOff + 4 + (i % 2 === 0 ? -stride : stride), r.shade, 1);
      }
      g.ellipse(15.5, bodyY, 6.8, 5.5, r.primary, r.shade, r.light);
      g.rect(12, bodyY, 2, 2, r.eye);
      g.rect(17, bodyY, 2, 2, r.eye);
      g.px(15, bodyY - 1, r.eye);
      break;
    }
    case 'frog': {
      bodyY = 19 + bob;
      headY = 14 + bob;
      g.ellipse(15.5, bodyY, 8.2, 5.8, r.primary, r.shade, r.light);
      g.ellipse(15.5, bodyY + 2, 5.5, 2.8, r.light);
      g.ellipse(11, headY, 2.8, 2.8, r.primary, r.shade, r.light);
      g.ellipse(20, headY, 2.8, 2.8, r.primary, r.shade, r.light);
      g.px(11, headY, r.eye);
      g.px(20, headY, r.eye);
      g.rect(8, 24, 4, 2, r.shade);
      g.rect(19, 24, 4, 2, r.shade);
      break;
    }
    case 'biped': {
      bodyY = 17 + bob;
      headY = 10 + bob;
      g.ellipse(15.5, bodyY + 1, 7.5, 7.2, r.primary, r.shade, r.light);
      g.ellipse(15.5, headY, 5.5, 4.8, r.primary, r.shade, r.light);
      g.rect(12, headY - 1, 2, 2, r.eye);
      g.rect(18, headY - 1, 2, 2, r.eye);
      g.rect(10 + stride * 0.5, 23, 4, 4, r.shade);
      g.rect(18 - stride * 0.5, 23, 4, 4, r.shade);
      break;
    }
  }

  drawFeaturePart(g, r.part1, phase, r, headY, bodyY);
  if (r.part2 && r.part2 !== 'none') {
    drawFeaturePart(g, r.part2, phase, r, headY, bodyY);
  }
  g.outline(outline);
  return true;
}
