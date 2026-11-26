// The six multi-product suites Claude looks at during the session.
// Every brand, domain and product here is invented. None of them is a real company.

export type SiteNav = { section?: string; items: string[] };

export type Site = {
  name: string;
  url: string; // shown in the browser bar
  brand: string; // brand colour
  header: 'light' | 'dark' | 'brand';
  /** How the suite separates its products. 'none' means they are merged into one menu. */
  switcher: 'tabs' | 'rail' | 'dropdown' | 'segmented' | 'none';
  products: string[];
  nav: SiteNav[];
  active: string;
  page:
    | { title: string; kind: 'table'; columns: string[]; rows: string[][] }
    | { title: string; kind: 'list'; rows: [string, string][] }
    | { title: string; kind: 'stats'; stats: [string, string][]; rows: string[][] };
  /** The single account area every one of them has, whatever it does with products. */
  account: { where: 'menu' | 'sidebar' | 'footer'; label: string; items: string[] };
  summary: string;
};

export const sites: Site[] = [
  {
    name: 'Corvane',
    url: 'console.corvane.io/cloud/instances',
    brand: '#0f766e',
    header: 'dark',
    switcher: 'tabs',
    products: ['Cloud', 'Commerce', 'Insights'],
    nav: [{ items: ['Overview', 'Instances', 'Storage', 'Networking', 'Monitoring'] }],
    active: 'Instances',
    page: {
      title: 'Instances',
      kind: 'table',
      columns: ['Name', 'Status', 'Region'],
      rows: [
        ['web-prod-01', 'Running', 'eu-west-2'],
        ['web-prod-02', 'Running', 'eu-west-2'],
        ['api-staging', 'Stopped', 'us-east-1'],
        ['worker-03', 'Running', 'us-east-1'],
      ],
    },
    account: { where: 'menu', label: 'Organization', items: ['Members', 'Billing', 'Settings'] },
    summary: '3 products kept apart',
  },
  {
    name: 'Ostrela',
    url: 'app.ostrela.com/docs/documents',
    brand: '#6d28d9',
    header: 'light',
    switcher: 'rail',
    products: ['Docs', 'Sign'],
    nav: [{ items: ['Home', 'Documents', 'Templates'] }],
    active: 'Documents',
    page: {
      title: 'Documents',
      kind: 'list',
      rows: [
        ['Q3 vendor agreement', '2h ago'],
        ['Onboarding pack', 'Yesterday'],
        ['Pricing proposal', 'Mon'],
        ['Partner NDA', 'Fri'],
      ],
    },
    account: { where: 'sidebar', label: 'Workspace', items: ['People', 'Billing', 'Settings'] },
    summary: '2 products kept apart',
  },
  {
    name: 'Tandril',
    url: 'tandril.app/orders',
    brand: '#c2410c',
    header: 'light',
    switcher: 'none',
    products: [],
    nav: [
      { section: 'Sell', items: ['Orders', 'Products'] },
      { section: 'Market', items: ['Campaigns', 'Email'] },
    ],
    active: 'Orders',
    page: {
      title: 'Orders',
      kind: 'stats',
      stats: [
        ['Today', '148'],
        ['Revenue', '£12.4k'],
        ['Returns', '3'],
      ],
      rows: [
        ['#4821', 'Paid', '£64.00'],
        ['#4820', 'Paid', '£212.50'],
      ],
    },
    account: { where: 'sidebar', label: 'Account', items: ['Team', 'Billing', 'Settings'] },
    summary: 'Merged into one menu',
  },
  {
    name: 'Vexley',
    url: 'hub.vexley.com/crm/deals',
    brand: '#1d4ed8',
    header: 'brand',
    switcher: 'dropdown',
    products: ['CRM', 'Desk', 'Sites', 'Pay'],
    nav: [{ items: ['Deals', 'Contacts', 'Companies', 'Reports'] }],
    active: 'Deals',
    page: {
      title: 'Deals',
      kind: 'table',
      columns: ['Deal', 'Stage', 'Value'],
      rows: [
        ['Brightwell renewal', 'Proposal', '$48,000'],
        ['Ashgrove pilot', 'Qualified', '$12,500'],
        ['Halden expansion', 'Won', '$96,000'],
      ],
    },
    account: { where: 'footer', label: 'Account settings', items: ['Users', 'Billing'] },
    summary: '4 products kept apart',
  },
  {
    name: 'Larkspan',
    url: 'larkspan.io/payroll/runs',
    brand: '#15803d',
    header: 'light',
    switcher: 'segmented',
    products: ['Payroll', 'Benefits'],
    nav: [{ items: ['Pay runs', 'Employees', 'Taxes', 'Reports'] }],
    active: 'Pay runs',
    page: {
      title: 'Pay runs',
      kind: 'table',
      columns: ['Period', 'People', 'Status'],
      rows: [
        ['November', '84', 'Scheduled'],
        ['October', '82', 'Paid'],
        ['September', '79', 'Paid'],
      ],
    },
    account: { where: 'menu', label: 'Company', items: ['Admins', 'Billing', 'Settings'] },
    summary: '2 products kept apart',
  },
  {
    name: 'Plumbrook',
    url: 'app.plumbrook.co/inbox',
    brand: '#be185d',
    header: 'light',
    switcher: 'none',
    products: [],
    nav: [
      { section: 'Support', items: ['Inbox', 'Tickets', 'Help center'] },
      { section: 'Grow', items: ['Live chat', 'Surveys'] },
    ],
    active: 'Inbox',
    page: {
      title: 'Inbox',
      kind: 'list',
      rows: [
        ['Can’t reset my password', '2m'],
        ['Invoice question', '18m'],
        ['Feature request: exports', '1h'],
        ['Login loop on mobile', '3h'],
      ],
    },
    account: { where: 'footer', label: 'Account & billing', items: [] },
    summary: 'Merged into one menu',
  },
];
