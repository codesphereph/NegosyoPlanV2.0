/**
 * NegosyoPlan front-end configuration.
 *
 * Paste your Google Apps Script Web App URL (ends with /exec) below.
 * Leave it empty to run in OFFLINE-ONLY mode: everything works and is saved
 * on this device, but there is no online backup or submission to OLEDIPO.
 */
window.GROW_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwLCRpZOyQHSH1iYJ4DRQEwo6r2zVBEAYPE4CyCA26ptHAnw-UYYvSDJ9P5CL-OFqVjYg/exec',
  SPLASH_MS: 2300, // length of the opening animation
  OFFICE: 'Office of the Local Economic Development and Investment Promotion Officer (OLEDIPO)',
  LGU: 'Provincial Government of Iloilo',
  VERSION: '4.4.0',
  /* Marketplace — External Support Services and merchants (hardcoded list).
     Fill in phone / email / facebook / address when OLEDIPO has them; empty contact fields are simply not shown. */
  MARKETPLACE: [
    { id: 'starita', name: 'Sta. Rita Accounting Office', category: 'Accounting & Compliance', icon: 'stamp', color: '#123A8C',
      tagline: 'BIR compliance monitoring and permit licensing',
      services: ['BIR compliance monitoring', 'Business permits and licensing', 'Other permit and licensing requirements'],
      phone: '', email: '', facebook: '', address: '' },
    { id: 'znl', name: 'ZnL Consultancy', category: 'Business & Financial Services', icon: 'chart', color: '#2EA54F',
      tagline: 'Business plan preparation and other financial services',
      services: ['Business plan preparation', 'Other financial services'],
      phone: '', email: '', facebook: '', address: '' },
    { id: 'cpupress', name: 'CPU Press', category: 'Printing Services', icon: 'print', color: '#F58B1F',
      tagline: 'Printing services',
      services: ['Printing services'],
      phone: '', email: '', facebook: '', address: '' }
  ]
};
