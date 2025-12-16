jQuery(document).ready(function($) {
  'use strict';

  let miniMap, currentState;
  let cityMarkers = [];
  let svgCache = {};

  const usStateAbbr = {
    'alabama':'al','alaska':'ak','arizona':'az','arkansas':'ar','california':'ca',
    'colorado':'co','connecticut':'ct','delaware':'de','florida':'fl','georgia':'ga',
    'hawaii':'hi','idaho':'id','illinois':'il','indiana':'in','iowa':'ia','kansas':'ks',
    'kentucky':'ky','louisiana':'la','maine':'me','maryland':'md','massachusetts':'ma',
    'michigan':'mi','minnesota':'mn','mississippi':'ms','missouri':'mo','montana':'mt',
    'nebraska':'ne','nevada':'nv','new-hampshire':'nh','new-jersey':'nj','new-mexico':'nm',
    'new-york':'ny','north-carolina':'nc','north-dakota':'nd','ohio':'oh','oklahoma':'ok',
    'oregon':'or','pennsylvania':'pa','rhode-island':'ri','south-carolina':'sc',
    'south-dakota':'sd','tennessee':'tn','texas':'tx','utah':'ut','vermont':'vt',
    'virginia':'va','washington':'wa','west-virginia':'wv','wisconsin':'wi','wyoming':'wy',
    'district-of-columbia':'wdc'
  };

  const abbrToState = Object.fromEntries(
    Object.entries(usStateAbbr).map(([slug, abbr]) => [abbr, slug])
  );

  if ($('#heroMap').length) initHeroMap();
  if ($('#map').length && $('#mapSection').length) {
    initSingleMap($('#map').data('country') || 'ireland');
  }

  function normalizeStateId(raw) {
    if (!raw) return '';
    const s = raw.toLowerCase()
      .replace(/^(state|usa?|us)[-_]/g, '')
      .replace(/[^a-z\-]/g, '');
    return (s.length <= 3) ? (abbrToState[s] || s) : (usStateAbbr[s] ? s : s);
  }

  function normalizeCitySlug(raw) {
    if (!raw) return '';
    return raw.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function getAssetUrl(path) {
    const base = window.providerLocator?.assetUrl || '/wp-content/plugins/providers/assets/';
    return base + path;
  }

  function initHeroMap() {
    showLoading('#heroMap');
    getStatesCounts('usa').then(data => {
      const candidates = ['images/usa-maps/usa.svg', 'images/usa.svg'];

      tryLoadSvg(candidates, 0, svgText => {
        const container = $('#heroMap')[0];
        container.innerHTML = svgText;
        const svg = container.querySelector('svg');
        if (svg) {
          prepareSvg(svg);
          styleSvgStates(svg, data.counts, data.upcoming);
        }
        hideLoading('#heroMap');
      }, () => {
        hideLoading('#heroMap');
        showError('#heroMap', 'Unable to load USA map');
      });
    });
  }

  function tryLoadSvg(candidates, idx, onSuccess, onFail) {
    if (idx >= candidates.length) {
      if (onFail) onFail();
      return;
    }

    const url = getAssetUrl(candidates[idx]);

    if (svgCache[url]) {
      onSuccess(svgCache[url]);
      return;
    }

    fetch(url)
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(text => {
        svgCache[url] = text;
        onSuccess(text);
      })
      .catch(() => tryLoadSvg(candidates, idx + 1, onSuccess, onFail));
  }

  function prepareSvg(svg) {
    if (!svg.getAttribute('viewBox')) {
      const w = parseFloat(svg.getAttribute('width')) || 810;
      const h = parseFloat(svg.getAttribute('height')) || 600;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.cssText = 'display:block;width:100%;height:100%;';
  }

  function getStatesCounts(country) {
    return new Promise(resolve => {
      const upcomingRaw = $('#heroMap').attr('data-upcoming') || '';
      const upcoming = upcomingRaw.split(',').map(s => s.trim()).filter(Boolean);

      $.ajax({
        url: providerLocator.ajaxUrl,
        type: 'POST',
        data: {
          action: 'get_states',
          country: country,
          nonce: providerLocator.nonce
        },
        success: response => {
          const counts = {};
          if (response?.success && response.data) {
            response.data.forEach(s => counts[s.slug] = s.count);
          }
          resolve({ counts, upcoming });
        },
        error: () => resolve({ counts: {}, upcoming })
      });
    });
  }

  function styleSvgStates(svg, counts, upcoming) {
    if (!svg) return;

    svg.querySelectorAll('[data-slug], [data-state], [id]').forEach(el => {
      const slug = normalizeStateId(
        el.getAttribute('data-slug') || el.getAttribute('data-state') || el.id
      );
      if (!slug) return;

      const hasCounts = counts[slug] > 0;
      const isUpcoming = upcoming.includes(slug);

      el.style.fill = hasCounts ? '#2563eb' : (isUpcoming ? '#10b981' : '#e5e7eb');
      el.style.stroke = '#ffffff';
      el.style.strokeWidth = '0.5';
      el.style.cursor = 'pointer';
      el.style.transition = 'all 0.3s ease';

      el.onmouseenter = function() {
        this.style.opacity = '0.85';
        this.style.filter = 'brightness(1.1)';
      };

      el.onmouseleave = function() {
        this.style.opacity = '1';
        this.style.filter = 'none';
      };

      el.onclick = () => selectState(slug);

      addStateLabel(svg, el, slug);
    });
  }

  function addStateLabel(svg, el, slug) {
    try {
      const bbox = el.getBBox();
      if (bbox.width < 10 || bbox.height < 10) return;

      const abbr = (usStateAbbr[slug] || slug).toUpperCase().slice(0, 2);
      const fontSize = Math.max(8, Math.min(16, Math.floor(bbox.width / 3)));

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = abbr;
      text.setAttribute('x', bbox.x + bbox.width / 2);
      text.setAttribute('y', bbox.y + bbox.height / 2);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('class', 'svg-state-label');
      text.setAttribute('font-size', fontSize + 'px');
      text.style.pointerEvents = 'none';

      svg.appendChild(text);
    } catch(e) {
      console.warn('Could not add label for:', slug);
    }
  }

  function selectState(slug) {
    currentState = normalizeStateId(slug);

    const svg = $('#heroMap svg')[0];
    if (svg) {
      svg.querySelectorAll('[data-slug], [data-state], [id]').forEach(e => {
        e.style.strokeWidth = '0.5';
        e.style.stroke = '#ffffff';
      });

      const selected = svg.querySelector(`#${slug}, [data-slug="${slug}"], [data-state="${slug}"]`);
      if (selected) {
        selected.style.strokeWidth = '3';
        selected.style.stroke = '#1d4ed8';
      }
    }

    loadMiniMap(currentState);
    scrollToMiniMap();
  }

  function loadMiniMap(state) {
    const stateName = state.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    $('#stateTitle').text(stateName + ' Service Providers');
    $('#miniMapSection').addClass('active').hide().fadeIn(400);

    showLoading('#miniMap');

    const abbr = usStateAbbr[state] || state.slice(0, 2);
    const candidates = [
      `images/usa-maps/usa-${abbr}.svg`,
      `images/usa-maps/${state}.svg`,
      `images/states/${state}.svg`
    ];

    tryLoadSvg(candidates, 0, svgText => {
      const container = $('#miniMap')[0];
      container.innerHTML = svgText;

      const svg = container.querySelector('svg');
      if (svg) {
        prepareSvg(svg);
        highlightCitiesInSvg(svg);
      }

      hideLoading('#miniMap');

      requestAnimationFrame(() => {
        loadCityPins('usa', state);
      });
    }, () => {
      hideLoading('#miniMap');
      $('.sidebar-content').html('<div class="error">Unable to load map for this state</div>');
    });
  }

  function highlightCitiesInSvg(svg) {
    svg.querySelectorAll('path, polygon, circle').forEach(el => {
      el.style.fill = '#e5e7eb';
      el.style.stroke = '#ffffff';
      el.style.strokeWidth = '1';
      el.style.transition = 'all 0.2s ease';
    });
  }

  function initSingleMap(country) {
    $('#mapSection').addClass('active');
    showLoading('#map');

    const countryMap = {
      'ireland': 'ireland',
      'uae': 'united-arab-emirates',
      'uk': 'united-kingdom',
      'usa': 'usa'
    };

    fetch(getAssetUrl(`images/${countryMap[country] || country}.svg`))
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(svgText => {
        $('#map')[0].innerHTML = svgText;
        const svg = $('#map svg')[0];
        if (svg) prepareSvg(svg);

        getStatesCounts(country).then(data => {
          if (!svg) return;

          svg.querySelectorAll('[data-slug], [data-state], [id]').forEach(el => {
            const slug = (el.getAttribute('data-slug') || el.getAttribute('data-state') || el.id || '')
              .toLowerCase().replace(/^state[-_]/, '').replace(/\s+/g, '-');

            el.style.fill = (data.counts[slug] > 0) ? '#2563eb' : '#e5e7eb';
            el.style.stroke = '#ffffff';
            el.style.strokeWidth = '1';
            el.style.cursor = 'pointer';
            el.style.transition = 'all 0.3s ease';

            el.onmouseenter = function() {
              this.style.opacity = '0.85';
              this.style.filter = 'brightness(1.05)';
            };
            el.onmouseleave = function() {
              this.style.opacity = '1';
              this.style.filter = 'none';
            };

            el.onclick = () => loadProviders(country, slug, '');
          });
        });

        hideLoading('#map');
        loadCityPins(country, null);
      })
      .catch(() => {
        hideLoading('#map');
        showError('#map', 'Unable to load map');
      });
  }

  function loadCityPins(country, state) {
    $('.sidebar-content').html('<div class="loading-box"><div class="spinner"></div><p>Loading locations...</p></div>');

    $.ajax({
      url: providerLocator.ajaxUrl,
      type: 'POST',
      data: {
        action: 'get_cities',
        country: country,
        state: state || '',
        nonce: providerLocator.nonce
      },
      success: response => {
        if (!response.success || !response.data || response.data.length === 0) {
          $('.sidebar-content').html('<div class="empty-state">No locations available for this area</div>');
          return;
        }

        const svg = $('#miniMap svg, #map svg')[0];
        const container = svg?.parentElement;

        if (svg && container) {
          renderSvgPinsWithMatching(container, svg, response.data, country, state);
        } else {
          $('.sidebar-content').html('<div class="empty-state">Map not available</div>');
        }
      },
      error: () => {
        $('.sidebar-content').html('<div class="error">Error loading locations. Please try again.</div>');
      }
    });
  }

  function renderSvgPinsWithMatching(container, svg, cities, country, state) {
    const overlay = container.querySelector('.svg-pin-overlay');
    if (overlay) overlay.remove();

    const svgRect = svg.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    container.style.position = 'relative';

    const overlayDiv = document.createElement('div');
    overlayDiv.className = 'svg-pin-overlay';
    overlayDiv.style.cssText = `
      position:absolute;
      left:${Math.round(svgRect.left - containerRect.left)}px;
      top:${Math.round(svgRect.top - containerRect.top)}px;
      width:${Math.round(svgRect.width)}px;
      height:${Math.round(svgRect.height)}px;
      pointer-events:none;
    `;
    container.appendChild(overlayDiv);

    let pinsPlaced = 0;
    const placedCities = [];

    cities.forEach(city => {
      const citySlug = normalizeCitySlug(city.slug || city.name || '');
      if (!citySlug) return;

      let position = findCityPositionInSvg(svg, citySlug, city.name, svgRect);

      if (!position && city.latitude && city.longitude) {
        position = convertGeoToSvgCoords(
          parseFloat(city.latitude),
          parseFloat(city.longitude),
          svg,
          svgRect,
          state
        );
      }

      if (position) {
        createPin(overlayDiv, position.x, position.y, city, country, state);
        pinsPlaced++;
        placedCities.push(city.name || city.slug);
      }
    });

    if (pinsPlaced === 0) {
      $('.sidebar-content').html('<div class="empty-state">No locations with valid coordinates found</div>');
    } else {
      $('.sidebar-content').html(`
        <div class="info-box">
          <div class="info-icon">📍</div>
          <div class="info-content">
            <strong>${pinsPlaced}</strong> ${pinsPlaced === 1 ? 'location' : 'locations'} available
            <p>Click any pin to view service providers</p>
          </div>
        </div>
      `);
    }

    console.log('Pins placed:', pinsPlaced, 'Cities:', placedCities.join(', '));
  }

  function findCityPositionInSvg(svg, citySlug, cityName, svgRect) {
    const variations = [
      citySlug,
      citySlug.replace(/-/g, ''),
      citySlug.replace(/-/g, '_'),
      'city-' + citySlug,
      citySlug + '-city',
      citySlug.split('-')[0],
      citySlug.split('-').join('')
    ];

    if (cityName) {
      const nameSlug = normalizeCitySlug(cityName);
      variations.push(nameSlug, nameSlug.replace(/-/g, ''), nameSlug.split('-')[0]);
    }

    for (let variant of variations) {
      const selectors = [
        `#${variant}`,
        `[id*="${variant}"]`,
        `[data-city="${variant}"]`,
        `[class*="${variant}"]`,
        `[data-name*="${variant}"]`,
        `circle[id*="${variant}"]`,
        `path[id*="${variant}"]`
      ];

      for (let selector of selectors) {
        try {
          const element = svg.querySelector(selector);
          if (element) {
            const pos = getSvgElementCenter(element, svg, svgRect);
            if (pos) {
              console.log('Found SVG element for:', citySlug, 'using selector:', selector);
              return pos;
            }
          }
        } catch(e) {}
      }
    }

    return null;
  }

  function getSvgElementCenter(element, svg, svgRect) {
    try {
      const bbox = element.getBBox();
      const centerX = bbox.x + bbox.width / 2;
      const centerY = bbox.y + bbox.height / 2;

      const viewBox = svg.viewBox.baseVal;
      const scaleX = svgRect.width / viewBox.width;
      const scaleY = svgRect.height / viewBox.height;

      return {
        x: centerX * scaleX,
        y: centerY * scaleY
      };
    } catch(e) {
      return null;
    }
  }

  function convertGeoToSvgCoords(lat, lng, svg, svgRect, state) {
    const viewBox = svg.viewBox.baseVal;
    if (!viewBox || viewBox.width === 0) return null;

    const stateRanges = {
      'florida': { lat: [24.5, 31], lng: [-87.5, -80] },
      'texas': { lat: [25.8, 36.5], lng: [-106.5, -93.5] },
      'california': { lat: [32.5, 42], lng: [-124.5, -114] }
    };

    let latRange = stateRanges[state]?.lat || [24, 50];
    let lngRange = stateRanges[state]?.lng || [-125, -65];

    const x = ((lng - lngRange[0]) / (lngRange[1] - lngRange[0])) * viewBox.width;
    const y = ((latRange[1] - lat) / (latRange[1] - latRange[0])) * viewBox.height;

    const scaleX = svgRect.width / viewBox.width;
    const scaleY = svgRect.height / viewBox.height;

    const finalX = Math.max(0, Math.min(svgRect.width, x * scaleX));
    const finalY = Math.max(0, Math.min(svgRect.height, y * scaleY));

    console.log('Geo to SVG:', { lat, lng, x: finalX, y: finalY });

    return { x: finalX, y: finalY };
  }

  function createPin(container, x, y, city, country, state) {
    const pin = document.createElement('div');
    pin.className = 'svg-pin';
    pin.style.cssText = `left:${x}px;top:${y}px;`;
    pin.innerHTML = '<div class="pin-inner"></div>';
    pin.title = city.name || city.slug;

    pin.onclick = e => {
      e.stopPropagation();
      container.querySelectorAll('.pin-inner').forEach(el => el.classList.remove('active'));
      pin.querySelector('.pin-inner').classList.add('active');
      loadProviders(country, state, city.slug);
    };

    container.appendChild(pin);
  }

  function loadProviders(country, state, city) {
    $('.sidebar-content').html('<div class="loading-box"><div class="spinner"></div><p>Loading providers...</p></div>');

    $.ajax({
      url: providerLocator.ajaxUrl,
      type: 'POST',
      data: {
        action: 'get_providers',
        country: country,
        state: state || '',
        city: city,
        nonce: providerLocator.nonce
      },
      success: response => {
        if (response.success && response.data && response.data.length > 0) {
          const cityName = city ? (response.data[0]?.city || city.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) : '';
          const title = cityName ? `${cityName} (${response.data.length})` : `Service Providers (${response.data.length})`;

          $('.sidebar-header h3').text(title);

          const html = response.data.map((p, i) => `
            <div class="provider-card" style="animation-delay: ${i * 0.05}s">
              <h4>${p.name}</h4>
              ${p.city ? `<p class="location"><span class="icon">📍</span>${p.city}</p>` : ''}
              ${p.address ? `<p class="address">${p.address}</p>` : ''}
              ${p.phone ? `<p class="phone"><span class="icon">📞</span>${p.phone}</p>` : ''}
              ${p.email ? `<p class="email"><span class="icon">✉️</span>${p.email}</p>` : ''}
              <a href="${p.link}" class="btn">View Details</a>
            </div>
          `).join('');

          $('.sidebar-content').html(html);
        } else {
          const cityName = city ? city.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'this location';
          $('.sidebar-header h3').text('No Providers Found');
          $('.sidebar-content').html(`<div class="empty-state">No service providers found in ${cityName}</div>`);
        }
      },
      error: () => {
        $('.sidebar-content').html('<div class="error">Error loading providers. Please try again.</div>');
      }
    });
  }

  function scrollToMiniMap() {
    $('html, body').animate({
      scrollTop: $('#miniMapSection').offset().top - 20
    }, 600, 'swing');
  }

  function showLoading(selector) {
    $(selector).addClass('loading-state').append('<div class="map-loader"><div class="spinner"></div></div>');
  }

  function hideLoading(selector) {
    $(selector).removeClass('loading-state').find('.map-loader').remove();
  }

  function showError(selector, message) {
    $(selector).html(`<div class="map-error">${message}</div>`);
  }
});
