import { initGlobe, flyToCity, drawArc } from './globe.js';
import { initUI } from './ui.js';

window.addEventListener('DOMContentLoaded', async () => {
  await initGlobe();
  initUI({ flyToCity, drawArc });
});
