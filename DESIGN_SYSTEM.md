# JKKN COE Design System

This document outlines the design system used in the JKKN Controller of Examination application, ensuring consistency, accessibility, and a professional user experience.

## Color Palette

### Primary Colors
- **Primary**: `hsl(142.1 76.2% 36.3%)` - Main brand color for actions and highlights
- **Primary Foreground**: `hsl(355.7 100% 97.3%)` - Text on primary backgrounds

### Status Colors
- **Success**: `hsl(142.1 76.2% 36.3%)` - Success states and positive actions
- **Warning**: `hsl(38 92% 50%)` - Warning states and caution
- **Error/Destructive**: `hsl(0 84.2% 60.2%)` - Error states and destructive actions
- **Info**: `hsl(217.2 91.2% 59.8%)` - Informational content

### Neutral Colors
- **Background**: `hsl(0 0% 100%)` - Main background color
- **Foreground**: `hsl(222.2 84% 4.9%)` - Primary text color
- **Muted**: `hsl(210 40% 98%)` - Muted backgrounds and borders
- **Muted Foreground**: `hsl(215.4 16.3% 46.9%)` - Secondary text color

## Typography

### Font Family
- **Primary**: Inter (Google Fonts)
- **Fallback**: system-ui, -apple-system, sans-serif

### Type Scale
- **Display**: `text-4xl font-bold tracking-tight lg:text-5xl` - Main headings
- **Heading**: `text-2xl font-semibold tracking-tight` - Section headings
- **Subheading**: `text-lg font-medium text-muted-foreground` - Subsection headings
- **Body**: `text-base leading-7` - Main content text
- **Caption**: `text-sm text-muted-foreground` - Small text and labels

## Spacing

### Base Unit
- **Base**: 4px (0.25rem)

### Spacing Scale
- **xs**: 4px (0.25rem)
- **sm**: 8px (0.5rem)
- **md**: 16px (1rem)
- **lg**: 24px (1.5rem)
- **xl**: 32px (2rem)
- **2xl**: 48px (3rem)
- **3xl**: 64px (4rem)

## Border Radius

- **sm**: `calc(var(--radius) - 4px)` - Small elements
- **md**: `calc(var(--radius) - 2px)` - Medium elements
- **lg**: `var(--radius)` (0.75rem) - Large elements and cards

## Shadows

- **sm**: `shadow-sm` - Subtle shadows for cards
- **md**: `shadow-md` - Medium shadows for elevated elements
- **lg**: `shadow-lg` - Large shadows for prominent elements
- **xl**: `shadow-xl` - Extra large shadows for modals and overlays

## Animations

### Transitions
- **Default**: `transition-all duration-200` - Standard transitions
- **Slow**: `transition-all duration-300` - Slower transitions for emphasis
- **Fast**: `transition-all duration-150` - Quick transitions for micro-interactions

### Keyframes
- **fadeIn**: Fade in from transparent to opaque
- **slideUp**: Slide up from 10px below with fade in
- **slideDown**: Slide down from 10px above with fade in
- **scaleIn**: Scale from 95% to 100% with fade in
- **bounceSubtle**: Subtle bounce animation for attention

### Hover Effects
- **hover-lift**: Lift element by 4px with enhanced shadow
- **hover-glow**: Add glow effect with primary color
- **hover-scale**: Scale element to 105% on hover

## Components

### Buttons
- **Primary**: Solid background with primary color
- **Secondary**: Muted background with subtle border
- **Outline**: Transparent background with border
- **Ghost**: Transparent background with hover state
- **Destructive**: Red background for destructive actions
- **Success**: Green background for positive actions
- **Warning**: Orange background for caution
- **Info**: Blue background for information

### Form Elements
- **Input**: Rounded borders with focus states
- **Select**: Consistent styling with input elements
- **Checkbox**: Custom styled checkboxes
- **Label**: Clear typography with proper spacing

### Cards
- **Default**: Rounded corners with subtle shadow
- **Hover**: Enhanced shadow on hover
- **Interactive**: Hover lift effect for clickable cards

### Status Indicators
- **Success**: Green background with success icon
- **Warning**: Orange background with warning icon
- **Error**: Red background with error icon
- **Info**: Blue background with info icon

## Accessibility

### Focus States
- All interactive elements have visible focus indicators
- Focus rings use the primary color with 2px width
- Focus offset ensures visibility on all backgrounds

### Color Contrast
- All text meets WCAG AA contrast requirements
- Status colors are tested for accessibility
- Dark mode support with appropriate contrast ratios

### Touch Targets
- Minimum 44px touch targets for mobile devices
- Adequate spacing between interactive elements
- Clear visual feedback for touch interactions

## Mobile Responsiveness

### Breakpoints
- **sm**: 640px - Small tablets and large phones
- **md**: 768px - Tablets
- **lg**: 1024px - Small laptops
- **xl**: 1280px - Large laptops and desktops

### Mobile-First Approach
- Base styles target mobile devices
- Progressive enhancement for larger screens
- Touch-friendly sizing and spacing
- Optimized layouts for different screen sizes

## Usage Guidelines

### Consistency
- Use design system components instead of custom styles
- Follow the established color palette
- Maintain consistent spacing and typography
- Apply animations consistently across the application

### Performance
- Animations are hardware-accelerated
- Minimal CSS for optimal loading
- Efficient use of Tailwind classes
- Lazy loading for non-critical animations

### Maintenance
- Design tokens are centralized in CSS variables
- Components are reusable and composable
- Clear documentation for all components
- Regular updates to maintain consistency

## Implementation

### CSS Variables
All design tokens are defined as CSS custom properties in `app/globals.css`:

```css
:root {
  --primary: 142.1 76.2% 36.3%;
  --primary-foreground: 355.7 100% 97.3%;
  /* ... other tokens */
}
```

### Tailwind Configuration
The design system is integrated with Tailwind CSS in `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    colors: {
      primary: 'hsl(var(--primary))',
      // ... other colors
    },
    animation: {
      fadeIn: 'fadeIn 0.5s ease-in-out',
      // ... other animations
    }
  }
}
```

### Component Usage
Import and use design system components:

```tsx
import { DisplayText, HoverLift, SuccessIndicator } from '@/components/ui/design-system'

<HoverLift>
  <DisplayText>Welcome to JKKN COE</DisplayText>
</HoverLift>
```

This design system ensures a cohesive, professional, and accessible user experience across the entire JKKN COE application.
