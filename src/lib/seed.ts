import { foundIncident, refreshIncident } from '@/domain/incident'
import type { Category, Incident, Report } from '@/domain/types'

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

interface SeedReportSpec {
  id: string
  text: string
  category: Category
  lat: number
  lng: number
  reporterToken: string
  minutesAgo: number
  incidentId: string | null
  flag?: Report['flag']
  flagReasons?: string[]
}

const seedReport = (spec: SeedReportSpec): Report => ({
  id: spec.id,
  text: spec.text,
  category: spec.category,
  location: { lat: spec.lat, lng: spec.lng },
  reporterToken: spec.reporterToken,
  at: minutesAgo(spec.minutesAgo),
  incidentId: spec.incidentId,
  flag: spec.flag ?? 'clear',
  flagReasons: spec.flagReasons ?? [],
})

/** Builds an incident honestly: found from the first member, then refresh. */
const makeIncident = (id: string, members: Report[], status: Incident['status']): Incident => ({
  ...refreshIncident(foundIncident(id, members[0]), members, new Date()),
  status,
})

/**
 * Demo data written on the first store read, so a fresh clone opens onto a
 * living product: two resolved incidents show the lifecycle, one active
 * medium-confidence incident is ready to climb, and one quarantined prank
 * proves the review lane works — every UI lane is non-empty immediately.
 *
 * @example
 * const { reports, incidents } = buildSeedData()
 */
export function buildSeedData(): { reports: Report[]; incidents: Incident[] } {
  const canteenFire = [
    seedReport({ id: 'seed-r-cf1', text: 'smoke coming from the canteen kitchen vents', category: 'fire', lat: 20.3533, lng: 85.82069, reporterToken: 'seed-asha', minutesAgo: 132, incidentId: 'seed-inc-canteen-fire' }),
    seedReport({ id: 'seed-r-cf2', text: 'small fire in the main canteen kitchen, staff using an extinguisher', category: 'fire', lat: 20.35336, lng: 85.82078, reporterToken: 'seed-vikram', minutesAgo: 130, incidentId: 'seed-inc-canteen-fire' }),
    seedReport({ id: 'seed-r-cf3', text: 'fire near the canteen, looks under control now', category: 'fire', lat: 20.35338, lng: 85.82072, reporterToken: 'seed-rohit', minutesAgo: 126, incidentId: 'seed-inc-canteen-fire' }),
  ]

  const pipeBurst = [
    seedReport({ id: 'seed-r-pb1', text: 'water pipe burst outside hostel 7, water everywhere', category: 'infrastructure', lat: 20.35187, lng: 85.81812, reporterToken: 'seed-imran', minutesAgo: 310, incidentId: 'seed-inc-pipe-burst' }),
    seedReport({ id: 'seed-r-pb2', text: 'big leak flooding the path near hostel 7 entrance', category: 'infrastructure', lat: 20.35191, lng: 85.8182, reporterToken: 'seed-lata', minutesAgo: 306, incidentId: 'seed-inc-pipe-burst' }),
    seedReport({ id: 'seed-r-pb3', text: 'burst pipe at hostel 7, ground floor is flooding', category: 'infrastructure', lat: 20.35185, lng: 85.81818, reporterToken: 'seed-gopal', minutesAgo: 302, incidentId: 'seed-inc-pipe-burst' }),
    seedReport({ id: 'seed-r-pb4', text: 'the water main near hostel 7 has burst, maintenance not here yet', category: 'infrastructure', lat: 20.35192, lng: 85.81815, reporterToken: 'seed-neha', minutesAgo: 298, incidentId: 'seed-inc-pipe-burst' }),
  ]

  const libraryMedical = [
    seedReport({ id: 'seed-r-lm1', text: 'a student collapsed near the library entrance', category: 'medical', lat: 20.3539, lng: 85.82, reporterToken: 'seed-meera', minutesAgo: 25, incidentId: 'seed-inc-library-medical' }),
    seedReport({ id: 'seed-r-lm2', text: 'someone fainted on the central library steps, not moving much', category: 'medical', lat: 20.354, lng: 85.82012, reporterToken: 'seed-arjun', minutesAgo: 17, incidentId: 'seed-inc-library-medical' }),
    seedReport({ id: 'seed-r-lm3', text: 'medical attention required at the library, person still on the ground', category: 'medical', lat: 20.35398, lng: 85.82008, reporterToken: 'seed-tanvi', minutesAgo: 9, incidentId: 'seed-inc-library-medical' }),
  ]

  // A lone dead-of-night report: joined normally (it founded an incident) but
  // marked 'watch' so the review lane shows the middle trust tier.
  const nightWatch = [
    seedReport({
      id: 'seed-r-nw1',
      text: 'person shouting and banging on doors near hostel 8',
      category: 'security', lat: 20.35189, lng: 85.81921,
      reporterToken: 'seed-nightowl', minutesAgo: 48,
      incidentId: 'seed-inc-night-watch',
      flag: 'watch',
      flagReasons: ['lone 01:00–05:00 report with no nearby corroboration in the last 10 min'],
    }),
  ]

  const prank = seedReport({
    id: 'seed-r-prank1',
    text: 'lol jk there is a dragon on the hostel roof',
    category: 'other', lat: 20.352, lng: 85.8195,
    reporterToken: 'seed-prankster', minutesAgo: 40,
    incidentId: null,
    flag: 'quarantined',
    flagReasons: ['joke lexicon: lol, jk, dragon'],
  })

  return {
    reports: [...canteenFire, ...pipeBurst, ...libraryMedical, ...nightWatch, prank],
    incidents: [
      makeIncident('seed-inc-canteen-fire', canteenFire, 'resolved'),
      makeIncident('seed-inc-pipe-burst', pipeBurst, 'resolved'),
      makeIncident('seed-inc-library-medical', libraryMedical, 'active'),
      makeIncident('seed-inc-night-watch', nightWatch, 'active'),
    ],
  }
}
