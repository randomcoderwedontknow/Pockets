export interface TutorialStep {
  id: number;
  title: string;
  body: string;
  /** Optional route to open when user taps the primary action on this step. */
  actionRoute?: string;
  actionLabel?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: 'What is a Pocket?',
    body: 'Pockets are containers for keeping related information together — like a folder for the things you care about.',
  },
  {
    id: 2,
    title: 'Create your first Pocket',
    body: 'Choose a name, icon, and colour. You decide what each Pocket is for — devices, links, records, or anything else.',
    actionRoute: '/pockets/new?tutorial=1',
    actionLabel: 'Open pocket creator',
  },
  {
    id: 3,
    title: 'Add information',
    body: 'Inside a Pocket, tap + Add to save items. Pick a type (note, link, code, and more) and add fields that fit what you are storing.',
    actionRoute: '/pockets',
    actionLabel: 'Go to Pockets',
  },
  {
    id: 4,
    title: 'Organise your information',
    body: 'Use tags, pin items to your home screen, and mark favourites so the important stuff stays easy to find.',
  },
  {
    id: 5,
    title: 'Search',
    body: 'Search titles, tags, and visible field values across your vault. Protected information is never included in search results.',
    actionRoute: '/search',
    actionLabel: 'Open search',
  },
  {
    id: 6,
    title: 'Protect sensitive information',
    body: 'Mark items or individual fields as protected. They stay encrypted and hidden until you unlock Pockets and choose Show.',
    actionRoute: '/settings/security',
    actionLabel: 'Security settings',
  },
  {
    id: 7,
    title: 'Lock Pockets',
    body: 'Turn on app lock so leaving Pockets requires your passcode or device authentication before anyone can read your vault.',
    actionRoute: '/settings/security',
    actionLabel: 'Lock settings',
  },
  {
    id: 8,
    title: 'Back up your vault',
    body: 'Everything stays on this device. Export creates a backup you can import later. There is no cloud sync in this version.',
    actionRoute: '/settings/data',
    actionLabel: 'Export & import',
  },
];
