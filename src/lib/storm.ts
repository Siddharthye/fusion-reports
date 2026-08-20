import type { Category, Coordinates } from '@/domain/types'

export type StormKey = 'fire' | 'medical' | 'harassment'

export interface StormReport {
  text: string
  lat: number
  lng: number
  category: Category
  reporterToken: string
}

interface ScenarioSpec {
  category: Category
  epicentre: Coordinates
  phrasings: string[]
  prank: string
}

/**
 * 16 distinct reporter tokens across 20 reports — a few people report twice,
 * exactly like real crowds, and the log-scaled reporter score lands the demo
 * at ~96% confidence rather than a suspicious 100%.
 */
const REPORTER_POOL = [
  'rt-anya', 'rt-vikram', 'rt-meera', 'rt-rohan', 'rt-sana', 'rt-arjun',
  'rt-divya', 'rt-kabir', 'rt-nisha', 'rt-farhan', 'rt-tara', 'rt-yash',
  'rt-priya', 'rt-dev', 'rt-isha', 'rt-omar',
]

/** ~±24m of GPS-style jitter, so the cluster is tight but never identical. */
const jitter = () => (Math.random() * 2 - 1) * 0.00022

/**
 * Each scenario is ONE physical event phrased twenty different ways —
 * epicentres are placed far enough (>250m) from the seeded active incidents
 * that a storm always founds a fresh incident instead of merging into a seed.
 */
const SCENARIOS: Record<StormKey, ScenarioSpec> = {
  fire: {
    category: 'fire',
    epicentre: { lat: 20.3536, lng: 85.81893 }, // Block C
    phrasings: [
      'Fire in Block C! I can see flames from the second floor window',
      'smoke coming out of block c second floor',
      'there is a fire at Block C, lots of smoke',
      'block c is on fire near the stairwell',
      'huge smoke cloud above Block C right now',
      'flames visible in the block C lab wing',
      'fire alarm going off in block c, smoke in the corridor',
      'burning smell near Block C, smoke everywhere',
      'block c fire — we are evacuating the second floor',
      'smoke filling the block C staircase',
      'fire near the block C chemistry lab, spreading fast',
      'people running out of block c, something is burning',
      'black smoke over block C, definitely a fire',
      'FIRE at block C east wing',
      'can see fire from the library, looks like block c',
      'a block c window has flames coming out of it',
      'smoke on the block c terrace, small fire maybe',
      'fire in c block, the corridor is full of smoke',
      'emergency — block c is burning, fire brigade required',
      'flames and heavy smoke at block c east side',
    ],
    prank: 'lol jk the dragon set block c on fire',
  },
  medical: {
    category: 'medical',
    epicentre: { lat: 20.3509, lng: 85.82199 }, // Sports Pavilion
    phrasings: [
      'a runner collapsed at the sports pavilion',
      'someone fainted on the track near the sports pavilion',
      'student down at the pavilion, not responding',
      'medical emergency at the sports ground pavilion',
      'a guy collapsed during practice at the pavilion',
      'person unconscious near the sports pavilion steps',
      'athlete collapsed at the pavilion, breathing but dazed',
      'someone passed out at the sports pavilion',
      'collapsed runner at the pavilion, crowd gathering',
      'first aid required at the sports pavilion immediately',
      'student fainted at the sports ground, near the pavilion',
      'unconscious person at the pavilion track side',
      'runner down at the sports pavilion, possible heat stroke',
      'medical team to the pavilion, a player collapsed',
      'someone is lying unresponsive at the sports pavilion',
      'a student collapsed mid-run at the pavilion',
      'pavilion emergency — runner unconscious on the track',
      'person collapsed at sports pavilion, they are pale and sweating',
      'ambulance required at the sports pavilion',
      'athlete unconscious near the pavilion entrance',
    ],
    prank: 'haha jk zombies attacked the sports pavilion',
  },
  harassment: {
    category: 'harassment',
    epicentre: { lat: 20.35563, lng: 85.82094 }, // Gate 3
    phrasings: [
      'a group is harassing a student near gate 3',
      'someone being catcalled repeatedly at gate 3',
      'harassment happening right now outside gate 3',
      'a girl is being followed near gate 3 security post',
      'group of men bothering students at gate 3',
      'verbal harassment at gate 3, she asked them to stop',
      'students being harassed near the gate 3 exit',
      'a senior is threatening a junior at gate 3',
      'harassment incident at gate 3, security not around',
      'somebody is being cornered near gate 3',
      'aggressive group harassing people at gate three',
      'a student is being intimidated outside gate 3',
      'harassment at gate 3, the crowd is not intervening',
      'two men following a student from gate 3',
      'gate 3 — a girl is asking them to leave her alone',
      'ongoing harassment near the gate 3 security post',
      'a group will not stop bothering a student at gate 3',
      'harassment near gate 3, she looks scared',
      'students report being harassed at gate 3 tonight',
      'gate 3 harassment, they are blocking her way',
    ],
    prank: 'bruh a unicorn is harassing people at gate 3 lmao',
  },
}

/**
 * The full storm payload: 20 varied phrasings of one event plus 1 obvious
 * prank, all destined for the REAL pipeline — nothing about the demo is
 * simulated downstream of this function.
 *
 * @example
 * stormInputs('fire') // => 21 reports, prank included at position 14
 */
export function stormInputs(key: StormKey): StormReport[] {
  const spec = SCENARIOS[key]

  const reports: StormReport[] = spec.phrasings.map((text, index) => ({
    text,
    lat: spec.epicentre.lat + jitter(),
    lng: spec.epicentre.lng + jitter(),
    category: spec.category,
    reporterToken: REPORTER_POOL[index % REPORTER_POOL.length],
  }))

  // The prank lands mid-storm, once confidence is already climbing — the
  // console shows it bounce into quarantine while the incident keeps building.
  reports.splice(14, 0, {
    text: spec.prank,
    lat: spec.epicentre.lat + jitter(),
    lng: spec.epicentre.lng + jitter(),
    category: spec.category,
    reporterToken: 'rt-prankster',
  })

  return reports
}
