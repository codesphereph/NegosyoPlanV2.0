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
  VERSION: '4.12.0',
  /* Demo buttons on the landing page (for presentations). Set to false to hide them in production. */
  DEMO: true,
  /* Online processing fee: charged when the loan is released, deducted together with the 3% service fee. */
  PROCESSING_FEE: { total: 100, codesphere: 70, oledipo: 30 },
  /* Loan points: earned from Marketplace purchases, needed before applying online. Keep equal to Code.gs. */
  POINTS: { required: 100, pesosPerPoint: 100 },
  /* Marketplace — External Support Services and merchants (hardcoded list).
     Fill in phone / email / facebook / address when OLEDIPO has them; empty contact fields are simply not shown.
     Optional: logo (image in assets/merchants/) and website (opens in a new tab). */
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
      phone: '', email: '', facebook: '', address: '' },
    { id: 'johnica', name: 'Johnica Musical Instruments', category: 'Shopping & Music', icon: 'store', color: '#1B2E7A',
      logo: 'assets/merchants/johnica.png', website: 'https://codesphereph.github.io/JohnicaMusicalInstruments/',
      tagline: 'Guitars, violins, keyboards, ukuleles, drums and percussion — shop, tune and learn',
      services: ['Musical instruments', 'Instrument tuning', 'Music lessons'],
      phone: '', email: '', facebook: '', address: '' },
    { id: 'greetopia', name: 'Greetopia', category: 'Gifts & Photo Booth', icon: 'store', color: '#0E1017',
      logo: 'assets/merchants/greetopia.png', website: 'https://1stballph.github.io/Greetopia/',
      tagline: 'Every Occasion, A Beautiful Creation.',
      services: ['AI photo booth and collages for every occasion', 'Greetings and keepsakes', 'Scan the QR and download your photos'],
      phone: '', email: '', facebook: '', address: '' }
  ]
};
