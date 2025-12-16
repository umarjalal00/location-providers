jQuery(document).ready(function($) {
  'use strict';

  let miniMap, currentState;
  let cityMarkers = [];

  const mapConfig = {
    options: {
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      dragging: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false
    }
  };

  const mapBounds = {
    usa: { center: [37.8, -96], zoom: 4 },
    florida: { center: [27.9944, -81.7603], zoom: 6 },
    texas: { center: [31.0, -99.0], zoom: 6 },
    california: { center: [36.7783, -119.4179], zoom: 6 },
    ireland: { center: [53.4, -8.0], zoom: 7 },
    uae: { center: [24.0, 54.0], zoom: 7 },
    uk: { center: [54.5, -3.5], zoom: 6 }
  };

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

  // Initialize maps
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

  function getAssetUrl(path) {
    const base = window.providerLocator?.assetUrl || '/wp-content/plugins/providers/assets/';
    return base + path;
  }

  function initHeroMap() {
    getStatesCounts('usa').then(data => {
      const candidates = [
        'images/usa-maps/usa.svg',
        'images/usa.svg'
      ];
      
      tryLoadSvg(candidates, 0, svgText => {
        const container = $('#heroMap')[0];
        container.innerHTML = svgText;
        const svg = container.querySelector('svg');
        if (svg) {
          svg.removeAttribute('width');
          svg.removeAttribute('height');
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          styleSvgStates(svg, data.counts, data.upcoming);
        }
      });
    });
  }

  function tryLoadSvg(candidates, idx, onSuccess, onFail) {
    if (idx >= candidates.length) {
      if (onFail) onFail();
      return;
    }
    
    fetch(getAssetUrl(candidates[idx]))
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(onSuccess)
      .catch(() => tryLoadSvg(candidates, idx + 1, onSuccess, onFail));
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
          if (response?.success) {
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
      
      el.style.fill = hasCounts ? '#2563eb' : (isUpcoming ? '#7c3aed' : '#d1dae3');
      el.style.cursor = 'pointer';
      el.onclick = () => selectState(slug);

      addStateLabel(svg, el, slug);
    });
  }

  function addStateLabel(svg, el, slug) {
    try {
      const bbox = el.getBBox();
      const abbr = (usStateAbbr[slug] || slug).toUpperCase().slice(0, 2);
      const fontSize = Math.max(10, Math.min(20, Math.floor(bbox.width / 3)));
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      Object.assign(text, {
        textContent: abbr,
        setAttribute: (k, v) => text.setAttributeNS(null, k, v)
      });
      text.setAttribute('x', bbox.x + bbox.width / 2);
      text.setAttribute('y', bbox.y + bbox.height / 2);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('class', 'svg-state-label');
      text.setAttribute('font-size', fontSize + 'px');
      
      svg.appendChild(text);
    } catch(e) {}
  }

  function selectState(slug) {
    currentState = normalizeStateId(slug);
    
    const svg = $('#heroMap svg')[0];
    if (svg) {
      svg.querySelectorAll('[data-slug], [data-state], [id]').forEach(e => {
        e.style.stroke = 'none';
      });
      
      const selected = svg.querySelector(`#${slug}, [data-slug="${slug}"]`);
      if (selected) selected.style.stroke = '#1d4ed8';
    }

    loadMiniMap(currentState);
    scrollToMiniMap();
  }

  function loadMiniMap(state) {
    $('#stateTitle').text(state.toUpperCase().replace(/-/g, ' ') + ' SERVICE PROVIDERS');
    $('#miniMapSection').addClass('active');

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
        if (!svg.getAttribute('viewBox')) {
          const w = parseFloat(svg.getAttribute('width')) || 810;
          const h = parseFloat(svg.getAttribute('height')) || 600;
          svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        }
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.style.cssText = 'display:block;width:auto;height:auto';
      }

      requestAnimationFrame(() => {
        loadCityPins('usa', state);
        loadProviders('usa', state, '');
      });
    }, () => {
      // Fallback to Leaflet map
      if (miniMap) miniMap.remove();
      const bounds = mapBounds[state] || mapBounds.usa;
      miniMap = L.map('miniMap', { ...mapConfig.options, center: bounds.center, zoom: bounds.zoom });
      loadCityPins('usa', state);
    });
  }

  function initSingleMap(country) {
    $('#mapSection').addClass('active');
    
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
        
        getStatesCounts(country).then(data => {
          const svg = $('#map svg')[0];
          if (!svg) return;
          
          svg.querySelectorAll('[data-slug], [data-state], [id]').forEach(el => {
            const slug = (el.getAttribute('data-slug') || el.getAttribute('data-state') || el.id || '')
              .toLowerCase().replace(/^state[-_]/, '').replace(/\s+/g, '-');
            
            el.style.fill = (data.counts[slug] > 0) ? '#2563eb' : '#d1dae3';
            el.style.cursor = 'pointer';
            el.onclick = () => loadProviders(country, slug, '');
          });
        });

        loadCityPins(country, null);
      })
      .catch(() => {
        // Fallback to Leaflet
        const bounds = mapBounds[country] || { center: [0, 0], zoom: 2 };
        const map = L.map('map', { ...mapConfig.options, center: bounds.center, zoom: bounds.zoom });
        loadCityPins(country, null, map);
      });
  }

  function loadCityPins(country, state, targetMap) {
    $('.sidebar-content').html('<div class="loading">Loading city pins...</div>');

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
        if (!response.success) {
          $('.sidebar-content').html('<div class="no-data">No city pins for this location</div>');
          return;
        }

        const svg = $('#miniMap svg, #map svg')[0];
        const container = svg?.parentElement;

        if (svg && container) {
          renderSvgPins(container, svg, response.data, country, state);
        } else {
          renderLeafletPins(targetMap || miniMap, response.data, country, state);
        }
      }
    });
  }

  function renderSvgPins(container, svg, cities, country, state) {
    const overlay = container.querySelector('.svg-pin-overlay');
    if (overlay) overlay.remove();

    const points = cities.filter(c => c.latitude && c.longitude).map(c => ({
      lat: parseFloat(c.latitude),
      lng: parseFloat(c.longitude),
      slug: c.slug || '',
      name: c.city || c.name || ''
    }));

    if (points.length === 0) {
      $('.sidebar-content').html('<div class="no-data">No city pins available</div>');
      return;
    }

    const bounds = computeBounds(points);
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

    points.forEach(city => {
      const x = ((city.lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin)) * svgRect.width;
      const y = (1 - (city.lat - bounds.latMin) / (bounds.latMax - bounds.latMin)) * svgRect.height;

      const pin = document.createElement('div');
      pin.className = 'custom-pin';
      pin.style.cssText = `left:${x}px;top:${y}px;pointer-events:auto;`;
      pin.innerHTML = '<div class="pin-inner"></div>';
      pin.onclick = e => {
        e.stopPropagation();
        overlayDiv.querySelectorAll('.pin-inner').forEach(el => el.classList.remove('active'));
        pin.querySelector('.pin-inner').classList.add('active');
        loadProviders(country, state, city.slug);
      };
      overlayDiv.appendChild(pin);
    });

    $('.sidebar-content').html('<div class="info">Select a city pin to view providers</div>');
  }

  function renderLeafletPins(map, cities, country, state) {
    cityMarkers.forEach(m => map?.removeLayer(m));
    cityMarkers = [];

    cities.forEach(city => {
      if (!city.latitude || !city.longitude) return;

      const marker = L.marker([parseFloat(city.latitude), parseFloat(city.longitude)], {
        icon: L.divIcon({
          className: 'custom-pin',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          html: '<div class="pin-inner"></div>'
        })
      })
      .addTo(map)
      .on('click', function() {
        $('.custom-pin').removeClass('active');
        this._icon.querySelector('.pin-inner').classList.add('active');
        loadProviders(country, state, city.slug);
      });

      if (city.name || city.slug) {
        marker.bindTooltip(city.name || city.slug, {
          direction: 'top',
          offset: [0, -10],
          className: 'city-tooltip'
        });
      }

      cityMarkers.push(marker);
    });

    $('.sidebar-content').html('<div class="info">Select a city pin to view providers</div>');
  }

  function computeBounds(points) {
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    return {
      latMin: Math.min(...lats),
      latMax: Math.max(...lats),
      lngMin: Math.min(...lngs),
      lngMax: Math.max(...lngs)
    };
  }

  function loadProviders(country, state, city) {
    $('.sidebar-content').html('<div class="loading">Loading providers...</div>');

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
        if (response.success && response.data.length > 0) {
          const cityName = city ? (response.data[0]?.city || city.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) : '';
          const title = cityName ? `${cityName} (${response.data.length})` : `Service Providers (${response.data.length})`;
          
          $('.sidebar-header h3').text(title);

          const html = response.data.map(p => `
            <div class="provider-card">
              <h4>${p.name}</h4>
              <p class="city">${p.city}</p>
              <p class="address">${p.address || 'Address not available'}</p>
              <a href="${p.link}" class="btn-view">View Details</a>
            </div>
          `).join('');

          $('.sidebar-content').html(html);
        } else {
          const cityName = city ? city.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Service Providers';
          $('.sidebar-header h3').text(cityName);
          $('.sidebar-content').html('<div class="no-data">No providers found in this location</div>');
        }
      },
      error: () => {
        $('.sidebar-content').html('<div class="error">Error loading providers</div>');
      }
    });
  }

  function scrollToMiniMap() {
    $('html, body').animate({
      scrollTop: $('#miniMapSection').offset().top - 20
    }, 600);
  }
});