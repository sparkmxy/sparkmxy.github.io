// The content and all navigation links remain usable without JavaScript.
// Choose once per page load; the original portrait is the no-JavaScript fallback.
const profilePhoto = document.querySelector('#profile-photo');
if (profilePhoto && Math.random() < 0.5) {
  profilePhoto.src = 'img/GB-photo-clipped.png';
  profilePhoto.alt = 'Xinyu Mao at the Golden Gate Bridge';
}

const indexLinks = [...document.querySelectorAll('.section-index a')];
const topLinks = [...document.querySelectorAll('.top-nav a[href^="#"]')];
const sections = [...document.querySelectorAll('#about, .content-section')];

function updateNavigation() {
  const threshold = document.querySelector('.site-header').offsetHeight + 90;
  let active = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= threshold) active = section;
  }
  if (Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2) {
    active = sections.at(-1);
  }
  if (!active) return;
  const topId = active.id === 'about' ? 'about'
    : ['preprints', 'publications'].includes(active.id) ? 'research' : 'education';
  for (const link of [...indexLinks, ...topLinks]) {
    const selected = link.hash === `#${indexLinks.includes(link) ? active.id : topId}`;
    if (selected) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

let framePending = false;
window.addEventListener('scroll', () => {
  if (framePending) return;
  framePending = true;
  window.requestAnimationFrame(() => {
    updateNavigation();
    framePending = false;
  });
}, { passive: true });
window.addEventListener('resize', updateNavigation);
updateNavigation();

// Keep the original visitor service on the live site, outside the critical render path.
const visitorMap = document.querySelector('#visitor-map');
const isLocal = ['localhost', '127.0.0.1', '[::1]', ''].includes(window.location.hostname);
if (visitorMap && !isLocal) {
  const loadVisitorMap = () => {
    const script = document.createElement('script');
    script.id = 'mapmyvisitors';
    script.async = true;
    script.src = 'https://mapmyvisitors.com/map.js?d=UFH5K7Yi-zmDj06CjiMnrWWMhHZe_KYRxgTCaeLLnyU&cl=ffffff&w=220';
    script.addEventListener('error', () => {
      visitorMap.querySelector('.visitor-note').textContent = 'The visitor map is temporarily unavailable.';
    });
    script.addEventListener('load', () => {
      visitorMap.querySelector('.visitor-note').hidden = true;
    });
    visitorMap.append(script);
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(loadVisitorMap, { timeout: 2500 });
  else window.setTimeout(loadVisitorMap, 1000);
}
