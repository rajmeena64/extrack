---
name: Entrack Visual Language
colors:
  surface: '#10141a'
  surface-dim: '#10141a'
  surface-bright: '#353940'
  surface-container-lowest: '#0a0e14'
  surface-container-low: '#181c22'
  surface-container: '#1c2026'
  surface-container-high: '#262a31'
  surface-container-highest: '#31353c'
  on-surface: '#dfe2eb'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dfe2eb'
  inverse-on-surface: '#2d3137'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#ffb786'
  on-tertiary: '#502400'
  tertiary-container: '#df7412'
  on-tertiary-container: '#461f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#10141a'
  on-background: '#dfe2eb'
  surface-variant: '#31353c'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is engineered for **Entrack**, a high-performance fintech SaaS designed for serious traders. The brand personality is **authoritative, analytical, and precise**. It avoids the playful tropes of retail investing apps in favor of a sophisticated, professional trading environment that prioritizes data density and clarity.

The visual style is **Corporate Minimalist with Glassmorphic accents**. It utilizes high-contrast typography and a structured grid to manage complex analytical data. Depth is created through translucent layers and subtle background blurs, suggesting a "cockpit" feel that is both modern and incredibly stable. The aesthetic evokes the reliability of institutional banking software merged with the agility of modern enterprise technology.

## Colors

The design system uses a **dual-mode palette** optimized for long-duration focus.

### Dark Mode (Default)
The primary environment for traders. It uses a deep navy-black base (`#05070A`) to reduce eye strain. Surfaces use a slightly elevated charcoal (`#0D1117`) with semi-transparent borders. Primary actions utilize a Professional Blue (`#3B82F6`) to signal utility and trust.

### Light Mode
Designed for high-glare environments and reporting. It transitions to a crisp white and soft gray base (`#F9FAFB`). The primary blue shifts to a slightly higher contrast variant (`#2563EB`) to maintain accessibility against the white background.

### Semantic Utility
- **Success:** Emerald 500 (for profitable trades).
- **Error:** Rose 500 (for losses/risks).
- **Secondary Accent:** Subtle Purple is reserved strictly for high-level analytics highlights and premium features.

## Typography

This design system employs **Inter** for all primary interface elements due to its exceptional legibility in data-dense layouts. Headlines are bold and tightly tracked to establish a strong hierarchy.

For financial figures, trade IDs, and timestamps, **JetBrains Mono** is used as a utility font (`data-mono`). This ensures that numerical columns in journals and analytics tables align perfectly, facilitating rapid scanning. 

### Scale Strategy
- **Headlines:** Use Bold (700) or SemiBold (600) to anchor sections.
- **Body:** Regular (400) for general content, Medium (500) for emphasized data points.
- **Micro-copy:** Use `label-caps` for table headers and metadata labels to provide clear distinction from the data itself.

## Layout & Spacing

The layout follows a **structured 12-column fluid grid** for desktop, optimized for side-by-side analytics panels. 

### Spacing Philosophy
The system uses a **4px base unit**. Given the complexity of trading journals, information density is prioritized over excessive whitespace. 
- **Dashboards:** Use "Compact" spacing (8px–12px) between data widgets.
- **Content Pages:** Use "Standard" spacing (24px–32px) for reading-heavy sections like trade post-mortems.
- **Breakpoints:** 
  - Mobile (<640px): 1-column, 16px margins.
  - Tablet (640px–1024px): 6-column, 24px margins.
  - Desktop (>1024px): 12-column, 32px margins, 16px gutters.

## Elevation & Depth

Depth in this design system is achieved through **Glassmorphism and Tonal Layering** rather than traditional heavy shadows.

1.  **Level 0 (Background):** Pure background color (`#05070A`).
2.  **Level 1 (Cards/Panels):** Surface color (`#0D1117`) with a 1px stroke (`#1F2937`).
3.  **Level 2 (Modals/Popovers):** Surface color with a **Backdrop Blur (20px)** and a subtle outer glow using the primary color at 5% opacity.

**Borders:** Use semi-transparent white in dark mode and semi-transparent black in light mode to ensure the borders feel integrated with the background rather than sitting on top of it.

## Shapes

The shape language is **Sharp and Disciplined**. A consistent `8px` (Soft) radius is applied to all primary containers, buttons, and input fields. This provides a modern feel while maintaining the serious, professional "edge" required for financial software.

- **Containers/Cards:** 8px (`rounded-lg` equivalent).
- **Buttons/Inputs:** 6px (customized slightly for a sharper look).
- **Status Indicators:** 2px or sharp for a technical, "indicator-light" aesthetic.

## Components

### Buttons
- **Primary:** Solid Professional Blue with white/near-white text. No gradients.
- **Secondary:** Ghost style with the 1px border and subtle hover state (background opacity 5%).
- **Size:** 36px height for standard, 44px for primary actions.

### Input Fields
- Dark Charcoal background with a 1px border. 
- Active state: Border changes to Primary Blue with a 2px outer "shadow" glow of the same color at 10% opacity.
- Typography: Use `body-sm` for labels and `data-mono` for numerical inputs.

### Cards & Data Tables
- Cards use the Level 1 elevation (1px border).
- Data tables use alternating row highlights (2% opacity white) rather than heavy lines to maintain a clean look. 
- Table headers use `label-caps` in Cool Gray.

### Icons
- Use **Clean Line Icons** (2px stroke weight). 
- Avoid filled icons unless indicating an active toggle state. 
- Color should match text-secondary unless they are interactive.

### Trade Journal Specifics
- **Status Chips:** Small, rectangular chips with 2px radius. Green background (10% opacity) with Green text for "Win," Red background (10% opacity) with Red text for "Loss."
- **Charts:** Use a clean 1px grid line for axes; avoid background fill under line charts to keep the focus on the price action.