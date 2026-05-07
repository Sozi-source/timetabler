/**
 * navigation.ts — add the trainer-assignments entry to your setup nav group.
 *
 * Find the setup section in your existing config/navigation.ts and add:
 *
 *   {
 *     label: 'Trainer Assignments',
 *     href:  '/setup/trainer-assignments',
 *     icon:  'UserCheck',          // or whatever icon component you use
 *     description: 'Assign trainers to units before generating',
 *   },
 *
 * Full example of what the setup group should look like:
 */

export const SETUP_NAV = [
  { label: 'Institution',          href: '/setup/institution' },
  { label: 'Departments',          href: '/setup/departments' },
  { label: 'Programmes',           href: '/setup/programmes' },
  { label: 'Curriculum',           href: '/setup/curriculum' },
  { label: 'Trainers',             href: '/setup/trainers' },
  { label: 'Rooms',                href: '/setup/rooms' },
  { label: 'Periods',              href: '/setup/periods' },
  { label: 'Terms',                href: '/setup/terms' },
  { label: 'Cohorts',              href: '/setup/cohorts' },
  { label: 'Units on Offer',       href: '/setup/units-on-offer' },
  // ── NEW ──────────────────────────────────────────────────────────────
  { label: 'Trainer Assignments',  href: '/setup/trainer-assignments' },
]