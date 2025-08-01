# HeroUI Calendar Components Documentation

## Core Components

### Calendar Component

- Basic date selection with grid navigation
- Supports min/max date restrictions
- Month and year pickers with `showMonthAndYearPickers`
- Controlled and uncontrolled variants
- Unavailable dates with `isDateUnavailable` callback

### DatePicker Component

- Combines DateInput with Calendar popover
- Time field support with `showTimeField`
- Custom selector icons and button placement
- Month/year picker integration
- International calendar support

### RangeCalendar Component

- Date range selection (start to end dates)
- Non-contiguous range support
- Multi-month display (up to 3 months)
- Controlled focused value management

## Key Properties

### Visual Customization

- `color`: default | primary | secondary | success | warning | danger
- `size`: sm | md | lg
- `radius`: none | sm | md | lg | full
- `variant`: flat | bordered | faded | underlined

### Functionality

- `showMonthAndYearPickers`: Enable month/year selection dropdowns
- `visibleMonths`: Display multiple months (1-3)
- `firstDayOfWeek`: Customize week start day
- `calendarWidth`: Control calendar size
- `isDateUnavailable`: Mark specific dates unavailable

### Content Slots

- `CalendarTopContent`: Custom header content
- `CalendarBottomContent`: Custom footer content
- `startContent` / `endContent`: Input decorations
- `selectorIcon`: Custom calendar trigger icon

## Required Dependencies

```bash
npm install @internationalized/date@3.8.2 @react-aria/i18n@3.12.11
```

## Example Usage

```tsx
import { Calendar, DatePicker } from "@heroui/react";
import { parseDate } from "@internationalized/date";

// Basic Calendar
<Calendar
  showMonthAndYearPickers
  defaultValue={parseDate("2024-01-15")}
/>

// DatePicker with time
<DatePicker
  label="Appointment"
  showTimeField
  showMonthAndYearPickers
/>

// Controlled Calendar
const [date, setDate] = useState(parseDate("2024-01-15"));
<Calendar
  value={date}
  onChange={setDate}
/>
```

## Custom Styling

Use `classNames` prop to customize individual slots:

- `base`: Calendar wrapper
- `header`: Calendar header
- `grid`: Date grid container
- `cell`: Individual date cells
- `cellButton`: Date selection buttons
