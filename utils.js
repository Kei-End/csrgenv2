export const KB = {
  baselines: {
    opensslMin: '1.1.1',
    opensshMin: '1.1.1',
    windowsMinYear: 2012,
    linuxCentOSMin: 7,
    apacheMin: '2.4.54',
    xamppMin: '7.4.33',
    phpMin: '7.4.33',
    iisMinMajor: '8.0'
  }
};

export const OS_OPTIONS = {
  Windows: [
    { value: 'Windows Server', label: 'Windows Server' },
    { value: 'Windows Client', label: 'Windows (Client)' },
    { value: 'Other Windows', label: 'Other Windows' }
  ],
  Linux: [
    { value: 'CentOS', label: 'CentOS' },
    { value: 'RHEL', label: 'RHEL' },
    { value: 'Ubuntu', label: 'Ubuntu' },
    { value: 'Debian', label: 'Debian' },
    { value: 'Rocky', label: 'Rocky Linux' },
    { value: 'AlmaLinux', label: 'AlmaLinux' },
    { value: 'Other Linux', label: 'Other Linux' }
  ]
};

export const SERVER_OPTIONS = {
  Windows: [
    { value: 'IIS', label: 'IIS' },
    { value: 'Apache', label: 'Apache' },
    { value: 'Nginx', label: 'Nginx' },
    { value: 'XAMPP', label: 'XAMPP' },
    { value: 'Tomcat', label: 'Tomcat / Java stack' },
    { value: 'Other', label: 'Other' }
  ],
  Linux: [
    { value: 'Apache', label: 'Apache' },
    { value: 'Nginx', label: 'Nginx' },
    { value: 'XAMPP', label: 'XAMPP' },
    { value: 'Tomcat', label: 'Tomcat / Java stack' },
    { value: 'Other', label: 'Other' }
  ]
};

export const ENVIRONMENT_FIELD_RULES = {
  Windows: {
    default: [],
    IIS: ['field_iisVersion', 'field_iisMethod'],
    Apache: ['field_apacheVersion', 'field_opensslVersion'],
    Nginx: ['field_nginxVersion', 'field_opensslVersion'],
    XAMPP: ['field_apacheVersion', 'field_xamppVersion', 'field_phpVersion', 'field_opensslVersion'],
    Tomcat: ['field_javaVersion'],
    Other: []
  },
  Linux: {
    default: ['field_opensshVersion'],
    Apache: ['field_apacheVersion', 'field_opensslVersion', 'field_opensshVersion'],
    Nginx: ['field_nginxVersion', 'field_opensslVersion', 'field_opensshVersion'],
    XAMPP: ['field_apacheVersion', 'field_xamppVersion', 'field_phpVersion', 'field_opensslVersion', 'field_opensshVersion'],
    Tomcat: ['field_javaVersion', 'field_opensshVersion'],
    Other: ['field_opensshVersion']
  }
};

export const ALL_ENVIRONMENT_FIELDS = [
  'field_iisVersion', 'field_iisMethod', 'field_nginxVersion', 'field_apacheVersion',
  'field_xamppVersion', 'field_phpVersion', 'field_javaVersion', 'field_opensslVersion', 'field_opensshVersion'
];
