# Mountain Peak Design Specification
## UltraCoach Application Design Concept

### 🏔️ Design Philosophy

The Mountain Peak design concept transforms UltraCoach from a generic business application into a bold, achievement-focused platform that embodies the spirit of high-altitude mountaineering and ultramarathon running. This design captures the mental and physical intensity of conquering peaks, while maintaining professional functionality for serious coaches and athletes.

**Core Principles:**
- **Bold & Dynamic**: Strong visual hierarchy with confident use of space and typography
- **Achievement-Focused**: Every element emphasizes progress, goals, and summit-conquering mentality
- **High-Performance**: Clean, data-driven interface that appeals to serious mountain athletes
- **Inspiring**: Visual elements that motivate and connect to the mountain climbing spirit

---

## 🎨 Color Palette

### Primary Palette: Alpine Blues
Inspired by high-altitude skies and glacial ice formations.

| Color | Hex Code | Usage | Notes |
|-------|----------|-------|-------|
| Alpine Blue 50 | `#f0f9ff` | Light backgrounds, subtle highlights | Crisp mountain air |
| Alpine Blue 100 | `#e0f2fe` | Card backgrounds, form fields | Fresh snow |
| Alpine Blue 200 | `#bae6fd` | Hover states, disabled elements | Glacial ice |
| Alpine Blue 300 | `#7dd3fc` | Secondary buttons, icons | Clear sky |
| Alpine Blue 400 | `#38bdf8` | Interactive elements, links | Deep mountain sky |
| Alpine Blue 500 | `#0ea5e9` | Active states, progress bars | Primary action color |
| Alpine Blue 600 | `#0284c7` | **PRIMARY BRAND COLOR** | Summit blue |
| Alpine Blue 700 | `#0369a1` | Hover states for primary | Deep alpine |
| Alpine Blue 800 | `#075985` | Text on light backgrounds | Mountain shadow |
| Alpine Blue 900 | `#0c4a6e` | Headers, bold text | Pre-dawn peaks |
| Alpine Blue 950 | `#082f49` | Dark theme backgrounds | Night mountains |

### Secondary Palette: Summit Gold
Achievement and accent colors inspired by sunrise on peaks.

| Color | Hex Code | Usage | Notes |
|-------|----------|-------|-------|
| Summit Gold 50 | `#fffbeb` | Achievement highlights | Golden hour glow |
| Summit Gold 100 | `#fef3c7` | Success backgrounds | Warm sunrise |
| Summit Gold 200 | `#fde68a` | Notification backgrounds | Morning light |
| Summit Gold 300 | `#fcd34d` | Warning states | Bright sunlight |
| Summit Gold 400 | `#fbbf24` | **SECONDARY BRAND COLOR** | Summit achievement |
| Summit Gold 500 | `#f59e0b` | Call-to-action buttons | Golden summit |
| Summit Gold 600 | `#d97706` | Hover states for gold | Intense gold |
| Summit Gold 700 | `#b45309` | Active achievement states | Deep gold |
| Summit Gold 800 | `#92400e` | Gold text on light | Bronze achievement |
| Summit Gold 900 | `#78350f` | Gold text on dark | Dark bronze |

### Neutral Palette: Granite Gray
Mountain stone-inspired neutrals for text and backgrounds.

| Color | Hex Code | Usage | Notes |
|-------|----------|-------|-------|
| Granite Gray 50 | `#f8fafc` | Page backgrounds | Snow-white |
| Granite Gray 100 | `#f1f5f9` | Card backgrounds | Light granite |
| Granite Gray 200 | `#e2e8f0` | Borders, dividers | Stone texture |
| Granite Gray 300 | `#cbd5e1` | Secondary borders | Mountain mist |
| Granite Gray 400 | `#94a3b8` | Disabled text | Weathered stone |
| Granite Gray 500 | `#64748b` | Body text | Mountain granite |
| Granite Gray 600 | `#475569` | Secondary headings | Dark stone |
| Granite Gray 700 | `#334155` | Primary text (light theme) | Deep granite |
| Granite Gray 800 | `#1e293b` | Headers, bold text | Charcoal stone |
| Granite Gray 900 | `#0f172a` | Dark theme text | Volcanic rock |

### Support Palette: Status Colors

| Purpose | Color Name | Hex Code | Usage |
|---------|------------|----------|-------|
| Success | Altitude Green 600 | `#059669` | Completed goals, positive metrics |
| Warning | Warning Orange 500 | `#f97316` | Caution states, moderate alerts |
| Danger | Danger Red 500 | `#ef4444` | Errors, critical alerts |
| Info | Alpine Blue 500 | `#0ea5e9` | Information, tips |

---

## 📝 Typography

### Font Stack
**Primary**: Inter (Google Fonts)
- **Fallback**: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **Reasoning**: Inter provides excellent readability at all sizes with a technical, professional feel that matches high-performance athletics

### Font Weights & Usage

| Weight | CSS Value | Usage | Examples |
|---------|-----------|-------|----------|
| Regular | 400 | Body text, descriptions | Workout descriptions, plan details |
| Medium | 500 | Navigation, labels | Nav links, form labels |
| Semibold | 600 | Subheadings, emphasis | Card titles, metric labels |
| Bold | 700 | Headings, important text | Page titles, achievement metrics |
| Extrabold | 800 | Hero text, brand | Main page headings, summit goals |

### Typographic Scale

```css
/* Display - Hero text */
h1 { 
  font-size: 2.5rem; 
  font-weight: 800; 
  line-height: 1.2; 
  letter-spacing: -0.025em;
}

/* Title - Page headings */
h2 { 
  font-size: 2rem; 
  font-weight: 700; 
  line-height: 1.2; 
}

/* Heading - Section titles */
h3 { 
  font-size: 1.5rem; 
  font-weight: 600; 
  line-height: 1.3; 
}

/* Subheading - Card titles */
h4 { 
  font-size: 1.25rem; 
  font-weight: 600; 
  line-height: 1.4; 
}

/* Body Large - Important descriptions */
.text-lg { 
  font-size: 1.125rem; 
  line-height: 1.6; 
}

/* Body - Standard text */
body { 
  font-size: 1rem; 
  line-height: 1.6; 
}

/* Body Small - Secondary text */
.text-sm { 
  font-size: 0.875rem; 
  line-height: 1.5; 
}

/* Caption - Metadata, labels */
.text-xs { 
  font-size: 0.75rem; 
  line-height: 1.4; 
  text-transform: uppercase; 
  letter-spacing: 0.05em; 
}
```

### Text Effects
- **Gradient Text**: Applied to main headings using Alpine Blue gradient
- **Letter Spacing**: Tight spacing (-0.025em) for display text, wider (0.05em) for small caps
- **Text Shadow**: Subtle shadows on hero text for depth

---

## 🏗️ Layout & Spacing

### Grid System
- **Max Width**: 1400px for main content areas
- **Columns**: CSS Grid with auto-fit columns, minimum 280px per column
- **Responsive Breakpoints**:
  - Mobile: < 480px
  - Tablet: 481px - 768px
  - Desktop: 769px - 1200px
  - Large: > 1200px

### Spacing Scale
Based on 0.25rem (4px) increments for consistent rhythm:

```css
--space-1: 0.25rem;   /* 4px - Tight spacing */
--space-2: 0.5rem;    /* 8px - Small gaps */
--space-3: 0.75rem;   /* 12px - Standard gaps */
--space-4: 1rem;      /* 16px - Medium spacing */
--space-6: 1.5rem;    /* 24px - Large spacing */
--space-8: 2rem;      /* 32px - Section spacing */
--space-12: 3rem;     /* 48px - Major sections */
--space-16: 4rem;     /* 64px - Page sections */
```

### Border Radius
- **Small**: 0.5rem (8px) - Buttons, small cards
- **Medium**: 0.75rem (12px) - Standard cards, forms
- **Large**: 1rem (16px) - Major cards, modals
- **Round**: 50% - Avatars, circular elements

---

## 🎯 Component Specifications

### Header Navigation
```css
.mountain-header {
  background: var(--bg-card);
  border-bottom: 2px solid var(--border-primary);
  box-shadow: var(--shadow-lg);
  position: sticky;
  top: 0;
  z-index: 100;
}

.brand-text {
  font-size: 1.75rem;
  font-weight: 800;
  background: var(--gradient-mountain);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Cards & Content Blocks
```css
.stat-card {
  background: var(--bg-card);
  border: 2px solid var(--border-primary);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
  border-color: var(--color-primary);
}
```

### Buttons
```css
/* Primary Button - Summit Achievement Style */
.create-btn.primary {
  background: var(--gradient-summit);
  color: var(--text-inverse);
  padding: 0.75rem 1.5rem;
  font-weight: 700;
  border-radius: 0.5rem;
  box-shadow: var(--shadow-md);
  transition: all 0.2s ease;
}

.create-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  filter: brightness(1.1);
}
```

### Progress Indicators
```css
.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--gradient-mountain);
  border-radius: 4px;
  transition: width 0.3s ease;
}
```

---

## 🌓 Dark/Light Mode Implementation

### Theme Toggle Mechanism
- Uses CSS classes `.light` and `.dark` on the `<html>` element
- Jotai atom for theme state management: `themeModeAtom`
- Smooth transitions (0.3s ease) between themes

### Light Theme Characteristics
- **Background**: Pure whites (#ffffff) and light grays
- **Text**: Dark granite grays for excellent contrast
- **Accent**: Alpine blues with full saturation
- **Feel**: Bright, energetic, daytime mountain atmosphere

### Dark Theme Characteristics
- **Background**: Deep night blues (#0a0e14) and charcoal grays
- **Text**: Snow whites and light grays for readability
- **Accent**: Brighter blues and golds for visibility
- **Feel**: Night mountain expedition, focused intensity

### Theme-Specific Variables
```css
/* Light Theme */
.light {
  --bg-primary: #ffffff;
  --text-primary: #0f172a;
  --color-primary: #0284c7;
}

/* Dark Theme */
.dark {
  --bg-primary: #0a0e14;
  --text-primary: #f8fafc;
  --color-primary: #38bdf8;
}
```

---

## 📊 Data Visualization

### Elevation Charts
- **Style**: Mountain silhouette SVG paths
- **Colors**: Alpine blue gradients with gold peak markers
- **Animation**: Smooth path drawing, peak highlighting

### Progress Rings
- **Implementation**: CSS conic-gradient for circular progress
- **Colors**: Alpine blue fill, gray background
- **Size**: 3rem diameter with 2rem inner circle

### Achievement Badges
- **Design**: Rounded rectangles with bold typography
- **Colors**: Context-specific (peak=gold, build=blue, base=green)
- **Typography**: Uppercase, condensed, high contrast

---

## 🏃‍♂️ Mountain Ultra Running Content Strategy

### Terminology & Language
- **Training Plans** → **Training Expeditions**
- **Workouts** → **Training Sessions** or **Climbs**
- **Goals** → **Summits** or **Peaks to Conquer**
- **Progress** → **Ascent Progress** or **Elevation Gained**
- **Dashboard** → **Summit Dashboard** or **Base Camp**

### Race Focus
Emphasize high-altitude and mountain ultramarathon events:
- Hardrock 100 (Silverton, CO)
- Mount Whitney Trail Race (Lone Pine, CA)
- UTMB Mont-Blanc (Chamonix, France)
- Western States 100 (California)
- Leadville Trail 100 (Colorado)

### Metrics Emphasis
- **Elevation Gain** prominently displayed
- **Altitude Adaptation** as a key metric
- **Vertical Meters per Week** as primary training measure
- **Peak Power** and **VO2 Max** for performance
- **Recovery Score** for training readiness

---

## ♿ Accessibility Features

### Color Contrast
- **WCAG AA Compliance**: All text meets 4.5:1 contrast ratio
- **Focus Indicators**: 2px solid outline with 2px offset
- **Interactive States**: Clear hover and active states

### Keyboard Navigation
- **Tab Order**: Logical flow through interactive elements
- **Focus Visible**: Prominent focus indicators
- **Skip Links**: Hidden navigation shortcuts

### Screen Reader Support
- **Semantic HTML**: Proper heading hierarchy
- **ARIA Labels**: Descriptive labels for interactive elements
- **Alt Text**: Meaningful descriptions for visual elements

---

## 🚀 Implementation Guide

### HeroUI Integration
The design uses HeroUI components as the foundation while applying Mountain Peak styling:

```typescript
// Example: Training Plan Card with Mountain Peak styling
<Card className="training-plan-card featured">
  <CardHeader className="plan-header">
    <Chip className="plan-badge peak">Peak Phase</Chip>
  </CardHeader>
  <CardBody className="plan-content">
    <h3>Hardrock 100 - Summit Assault</h3>
    <div className="plan-progress">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: '87%' }} />
      </div>
    </div>
  </CardBody>
</Card>
```

### CSS Custom Properties Setup
```css
/* Integrate with HeroUI theme system */
:root {
  --heroui-primary: var(--alpine-blue-600);
  --heroui-secondary: var(--summit-gold-500);
  --heroui-success: var(--altitude-green-600);
  --heroui-warning: var(--warning-orange-500);
  --heroui-danger: var(--danger-red-500);
}
```

### Tailwind Configuration
```javascript
// Update tailwind.config.js for Mountain Peak theme
module.exports = {
  theme: {
    extend: {
      colors: {
        'alpine-blue': {
          50: '#f0f9ff',
          600: '#0284c7',
          // ... full scale
        },
        'summit-gold': {
          400: '#fbbf24',
          500: '#f59e0b',
          // ... full scale
        }
      }
    }
  }
}
```

### Performance Considerations
- **CSS Custom Properties**: Efficient theme switching
- **Gradient Optimizations**: Use CSS gradients over images
- **Transition Performance**: Limit animations to transform and opacity
- **Image Optimization**: SVG icons for crisp scaling

---

## 📱 Responsive Behavior

### Mobile Adaptations
- **Navigation**: Collapsible hamburger menu
- **Cards**: Single column layout
- **Typography**: Reduced scale for smaller screens
- **Touch Targets**: Minimum 44px for interactive elements

### Tablet Adaptations
- **Grid**: 2-column layout for most content
- **Navigation**: Horizontal with some grouping
- **Cards**: Optimized for portrait and landscape

### Desktop Enhancements
- **Hover Effects**: Rich micro-interactions
- **Multi-column**: Full grid layouts
- **Keyboard Shortcuts**: Power user features

---

## 🎯 Success Metrics

### Design Goals
1. **Increased Engagement**: 25% more time spent in application
2. **Achievement Focus**: Clear progress visualization increases goal completion
3. **Brand Recognition**: Mountain aesthetic creates memorable experience
4. **User Satisfaction**: Professional athletes feel the platform matches their intensity

### Technical Goals
1. **Performance**: No impact on load times despite rich visuals
2. **Accessibility**: WCAG AA compliance maintained
3. **Maintenance**: Clean, organized CSS architecture
4. **Scalability**: Theme system supports future color schemes

---

## 🔄 Future Enhancements

### Potential Additions
1. **Seasonal Themes**: Winter/Summer mountain variations
2. **Achievement Animations**: Celebration micro-interactions
3. **Elevation Profiles**: Interactive SVG course maps
4. **Weather Integration**: Real mountain conditions
5. **Photo Integration**: User summit photos as backgrounds

### Advanced Features
1. **3D Elements**: CSS transforms for depth
2. **Particle Effects**: Subtle snow or mist animations
3. **Parallax Scrolling**: Mountain landscape backgrounds
4. **Custom Cursors**: Mountain-themed interaction cursors

---

This Mountain Peak design concept transforms UltraCoach into a bold, achievement-focused platform that resonates with the intensity and determination of mountain ultramarathon runners while maintaining the professional functionality required for serious coaching relationships.