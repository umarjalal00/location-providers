# SVG Preparation Guide for Accurate Pin Placement

## Quick Start

To ensure pins appear at the correct locations on your SVG maps, follow these simple guidelines:

---

## 📍 Method 1: Name Your SVG Elements (RECOMMENDED)

### Best Practice
Match your SVG path/circle IDs to your WordPress city taxonomy slugs.

### Example

#### WordPress City Taxonomy
- Slug: `miami`
- Name: Miami

#### SVG Code
```xml
<svg viewBox="0 0 810 600">
  <!-- Simple ID match -->
  <circle id="miami" cx="450" cy="380" r="5"/>

  <!-- Or for a path -->
  <path id="houston" d="M 250,300 L 260,310 Z"/>

  <!-- Multi-word cities (use hyphens) -->
  <circle id="los-angeles" cx="150" cy="200" r="5"/>
  <path id="new-york" d="M 700,150 L 710,160 Z"/>
</svg>
```

---

## 🎯 Naming Patterns That Work

The system automatically tries these variations:

### For city slug: "miami"
✅ `id="miami"`
✅ `id="Miami"`
✅ `id="city-miami"`
✅ `id="miami-city"`
✅ `data-city="miami"`
✅ `class="miami"`

### For city slug: "los-angeles"
✅ `id="los-angeles"`
✅ `id="losangeles"`
✅ `id="los_angeles"`
✅ `id="los"` (first word)
✅ `data-city="los-angeles"`

---

## 🗺️ SVG Structure Examples

### State Map with Cities (Florida Example)

```xml
<svg viewBox="0 0 810 600" xmlns="http://www.w3.org/2000/svg">
  <!-- State outline -->
  <path id="florida-state" fill="#e5e7eb" d="M 100,100 L 500,100..."/>

  <!-- Cities as circles -->
  <circle id="miami" cx="420" cy="480" r="6" fill="#2563eb"/>
  <circle id="tampa" cx="350" cy="350" r="6" fill="#2563eb"/>
  <circle id="orlando" cx="380" cy="370" r="6" fill="#2563eb"/>
  <circle id="jacksonville" cx="390" cy="200" r="6" fill="#2563eb"/>

  <!-- Or as paths -->
  <path id="tallahassee" d="M 250,150 A 5,5 0 1,0 260,150 Z"/>
</svg>
```

### USA Map with States

```xml
<svg viewBox="0 0 810 600" xmlns="http://www.w3.org/2000/svg">
  <!-- States -->
  <path id="florida" d="M 600,450 L 650,450..."/>
  <path id="texas" d="M 350,400 L 450,400..."/>
  <path id="california" d="M 100,300 L 150,350..."/>

  <!-- Alternative: using data attributes -->
  <path data-state="florida" d="..."/>
</svg>
```

---

## 📐 Method 2: Use Geographic Coordinates (FALLBACK)

If you can't modify SVG IDs, ensure accurate coordinates in your provider posts:

### Provider Meta Fields
```php
Latitude: 25.7617    // Miami
Longitude: -80.1918  // Miami
```

### Supported States with Optimized Ranges
- **Florida**: Lat [24.5, 31], Lng [-87.5, -80]
- **Texas**: Lat [25.8, 36.5], Lng [-106.5, -93.5]
- **California**: Lat [32.5, 42], Lng [-124.5, -114]
- **Default USA**: Lat [24, 50], Lng [-125, -65]

---

## ✅ SVG Requirements Checklist

### Must Have
- [ ] `viewBox` attribute on `<svg>` element
- [ ] Unique IDs or classes for each city location
- [ ] Valid SVG structure

### Recommended
- [ ] City IDs match WordPress city slugs exactly
- [ ] Use lowercase with hyphens (kebab-case)
- [ ] Include both circles/paths for cities
- [ ] Reasonable viewBox dimensions (800-1000px width)

---

## 🔍 Finding City Locations in Your SVG

### Option 1: Visual Inspection
1. Open SVG in a vector editor (Inkscape, Illustrator)
2. Identify city locations
3. Add circles or paths at those points
4. Name them with city slugs

### Option 2: Use Geographic Data
1. Get latitude/longitude for each city
2. Convert to SVG coordinates manually
3. Or let the plugin handle it automatically

---

## 🛠️ Tools for SVG Editing

### Free Tools
- **Inkscape** - Full-featured SVG editor
- **SVG-Edit** - Browser-based editor
- **VS Code** - With SVG extension for code editing

### Online Tools
- **Figma** - Design and export SVG
- **Boxy SVG** - Chrome app for SVG editing

---

## 📝 Example: Converting a Generic SVG

### Before (No City Markers)
```xml
<svg viewBox="0 0 810 600">
  <path id="state-outline" d="M 100,100 L 500,500 Z"/>
</svg>
```

### After (With City Markers)
```xml
<svg viewBox="0 0 810 600">
  <path id="state-outline" d="M 100,100 L 500,500 Z"/>

  <!-- Added city markers -->
  <g id="cities">
    <circle id="miami" cx="420" cy="480" r="5" class="city-marker"/>
    <circle id="tampa" cx="350" cy="350" r="5" class="city-marker"/>
    <circle id="orlando" cx="380" cy="370" r="5" class="city-marker"/>
  </g>

  <!-- Optional: Labels -->
  <text x="425" y="475" font-size="10" class="city-label">Miami</text>
</svg>
```

---

## 🐛 Troubleshooting

### Pins Don't Appear
1. Check browser console for errors
2. Verify city taxonomy slugs match SVG IDs
3. Ensure SVG has viewBox attribute
4. Check if latitude/longitude values exist

### Pins Appear at Wrong Location
1. Verify SVG IDs match city slugs exactly
2. Check coordinate accuracy (if using lat/lng)
3. Inspect SVG viewBox dimensions
4. Review state-specific coordinate ranges

### How to Debug
```javascript
// Open browser console and look for:
"Found SVG element for: miami using selector: #miami"
"Pins placed: 3 Cities: Miami, Houston, Los Angeles"
```

---

## 💡 Pro Tips

1. **Keep it Simple**: Use basic IDs like `id="miami"` instead of `id="city-of-miami-florida"`

2. **Consistency**: Use the same naming pattern throughout all your SVGs

3. **Test First**: Test with 2-3 cities before adding all locations

4. **Fallback Ready**: Add coordinates even if you use SVG IDs (backup method)

5. **Group Elements**: Use `<g id="cities">` to organize city markers

6. **Hide Markers**: Make city circles transparent in SVG, pins will overlay them

---

## 📚 Additional Resources

### SVG Specifications
- [MDN SVG Tutorial](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial)
- [SVG Coordinate Systems](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Positions)

### WordPress Taxonomies
- Check your city taxonomy slugs: `WordPress Admin → Providers → Cities`
- Slugs are auto-generated from city names (lowercase, hyphens)

---

## 📞 Need Help?

1. Check the console logs for debugging info
2. Verify your SVG structure
3. Review the IMPROVEMENTS.md file for detailed explanations

---

**Happy Mapping!** 🗺️✨
