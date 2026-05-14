# EXTrack Figma Design Brief

## Product Direction

EXTrack is a trading journal and performance dashboard. The design should feel calm, dense, and operational: a tool traders can scan quickly after a session, not a marketing-heavy crypto app.

## Canvas Structure

Create one Figma page named `EXTrack App Design`.

Recommended frames:

- `01 Landing / Desktop` - 1440 x 1024
- `02 Dashboard / Desktop` - 1440 x 1024
- `03 Add Trade / Desktop` - 1440 x 1024
- `04 Analytics / Desktop` - 1440 x 1024
- `05 Trade Detail / Desktop` - 1440 x 1024
- `06 Dashboard / Mobile` - 390 x 844
- `07 Add Trade / Mobile` - 390 x 844
- `08 Components` - buttons, stat cards, inputs, tabs, trade rows, chart cards

## Visual System

Colors:

- App background: `#EAF0F7`
- Surface: `#FFFFFF`
- Primary text: `#131A5E`
- Secondary text: `#475569`
- Muted text: `#64748B`
- Primary action: `#3B82F6`
- Deep action: `#5124BD`
- Profit: `#10B981`
- Loss: `#EF4444`
- Border: `rgba(194, 185, 185, 0.34)`
- Dark background: `#000000`
- Dark surface: `#11151F`
- Dark text: `#DFE7C9`

Typography:

- Font: Roboto
- Page title: 16-18 px, 700, uppercase
- Section title: 12-13 px, 700, uppercase
- Body: 14 px, 400
- Caption: 11-12 px, 400
- Metric value: 22-28 px, 700

Shape and spacing:

- Sidebar width: 60 px desktop
- Page padding: 16 px desktop, 12 px mobile
- Card radius: 12-16 px
- Compact card padding: 12 px
- Grid gap: 14 px
- Button radius: 8 px

## Components

Sidebar:

- Collapsed vertical navigation, 60 px wide
- Logo at top
- Icon buttons for Dashboard, Add Trade, Analytics, Daily View, Profile/Settings
- Active item uses primary/deep blue accent

Top Header:

- Page title on left
- Date range picker
- Currency selector
- Trade mode segmented control: `All`, `Manual`, `MT5`, `CSV`
- User/profile action on right

Stat Card:

- Label
- Large value
- Small comparison/helper text
- Optional tone indicator: profit/loss/neutral
- Use for Total P&L, Win Rate, Profit Factor, Trades, Avg Win/Loss

Chart Card:

- Small uppercase title
- Optional toolbar in header
- Chart body with clear empty/loading state
- Reused for progress, performance, radar, activity, and calendar

Trade Row:

- Symbol with icon
- Direction badge
- Setup/notes preview
- Date/time
- P&L value aligned right
- Profit/loss color

Form Field:

- Label
- Input/select/date picker
- Helper/error text
- Consistent 40 px control height

## Screen Details

### 01 Landing / Desktop

Hero-first landing page for unauthenticated users.

Layout:

- Top nav with EXTrack logo left and `Sign in` button right
- Hero copy left:
  - Eyebrow: `Trade review, without the spreadsheet drag`
  - H1: `Know what your trading is really doing.`
  - Body text describing imports, P&L, calendar review, setup tracking
  - Primary CTA: `Start tracking`
  - Secondary CTA: `I already have an account`
- Dashboard preview right:
  - Three metric cards
  - Performance chart preview
  - Recent trades list with XAUUSD, EURUSD, NAS100
- Feature strip below:
  - Import fast
  - Read the edge
  - Review by day
  - Stay focused

### 02 Dashboard / Desktop

Primary authenticated app screen.

Layout:

- Sidebar fixed left
- Header row
- Five stat cards in responsive grid
- Dashboard grid:
  - Progress tracker
  - Performance chart
  - Radar / setup quality
  - Activity chart
  - P&L calendar
  - Recent trades table

Design notes:

- Keep dashboard dense and scan-friendly
- Avoid oversized decorative hero treatment
- Charts should have quiet gridlines and strong profit/loss cues
- Recent trades should feel like a working table, not cards stacked loosely

### 03 Add Trade / Desktop

Trade import and entry hub.

Layout:

- Header: `Add Trade`
- Tabs or segmented control:
  - Manual
  - CSV Upload
  - API Import
  - MT5 / cTrader
- Manual form:
  - Symbol, direction, entry, exit, lot size, commission, date/time
  - Setup, strategy, screenshot upload, notes
  - Save trade primary action
- Right side summary:
  - Estimated P&L
  - Risk/reward
  - Validation checklist

### 04 Analytics / Desktop

Performance research screen.

Layout:

- Header with date range and filters
- KPI strip
- Heatmap panel
- News/events panel
- Breakdown charts:
  - By symbol
  - By session
  - By setup
  - By weekday
- Insight list with concise text rows

### 05 Trade Detail / Desktop

Single trade review screen.

Layout:

- Back action
- Trade title row: symbol, direction, date, P&L
- Chart/screenshot panel
- Trade facts panel
- Notes and mistake tags
- Timeline of entry/exit/updates
- Related trades or similar setup comparison

### 06 Dashboard / Mobile

Mobile app should prioritize review over full data density.

Layout:

- Compact top bar
- Horizontal stat carousel or two-column stat grid
- Stacked chart cards
- Calendar collapsed into weekly/month summary
- Recent trades list full width
- Bottom navigation instead of left sidebar

### 07 Add Trade / Mobile

Mobile form should be step-based.

Flow:

1. Market and direction
2. Entry/exit details
3. Risk and size
4. Notes/screenshot
5. Review and save

## Interaction States

Include these states in components:

- Default
- Hover
- Active/selected
- Disabled
- Loading skeleton
- Empty state
- Error state for forms

## Figma Build Notes

When Figma MCP limit is available again:

1. Use existing file `Extrack Trading Dashboard` with file key `npfpdA9549uIB8sZWaJ0oC`.
2. Create a new page named `EXTrack App Design`.
3. Build the component frame first.
4. Create desktop frames, then mobile frames.
5. Use the existing code colors as local Figma variables.
6. Validate each frame visually for clipped text, overlap, and mobile overflow.
