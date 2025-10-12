# Modern CSS Styling Guide

This project now includes a comprehensive modern CSS styling system with the following features:

## CSS Architecture

1. **variables.css** - Contains all CSS custom properties (variables) for consistent design
2. **index.css** - Base styles and CSS reset
3. **modern-styles.css** - Component-specific styles for the messaging app
4. **components.css** - Reusable component styles
5. **App.css** - Page-level styles

## Color Palette

- Primary: `#6366f1` (Indigo)
- Secondary: `#10b981` (Emerald)
- Dark: `#1e293b` (Slate)
- Light: `#f8fafc` (Slate 50)

## Typography

- Font Family: Inter (with system fallbacks)
- Responsive font sizes using CSS variables

## Spacing System

- Uses a consistent spacing scale: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32 (in 0.25rem units)

## Shadow System

- xs, sm, base, md, lg, xl, 2xl - Progressive shadow depths

## Border Radius

- xs, sm, md, lg, xl, 2xl, 3xl, full - Consistent rounding scale

## Component Classes

### Buttons
- `.btn` - Base button
- `.btn-primary` - Primary action
- `.btn-secondary` - Secondary action
- `.btn-outline` - Outline variant
- `.btn-danger` - Destructive action
- `.btn-success` - Success action
- `.btn-info` - Info action

### Forms
- `.form-group` - Form field container
- `.form-label` - Form label
- `.form-input` - Text input
- `.form-select` - Select dropdown
- `.form-textarea` - Text area

### Alerts
- `.alert` - Base alert
- `.alert-success` - Success alert
- `.alert-error` - Error alert
- `.alert-warning` - Warning alert
- `.alert-info` - Info alert

### Cards
- `.card-modern` - Modern card component
- `.card-header` - Card header
- `.card-title` - Card title
- `.card-body` - Card body
- `.card-footer` - Card footer

### Avatars
- `.avatar` - Base avatar
- `.avatar-sm` - Small avatar
- `.avatar-md` - Medium avatar
- `.avatar-lg` - Large avatar
- `.avatar-primary` - Primary color
- `.avatar-secondary` - Secondary color

## Responsive Design

All components are designed to be responsive with mobile-first approach. Media queries are defined for:
- Small screens (default)
- Medium screens (768px)
- Large screens (1024px)

## Animations

- Fade in animations
- Hover transitions
- Pulse animations

## Usage Examples

```html
<!-- Button -->
<button class="btn btn-primary">Primary Button</button>

<!-- Form -->
<div class="form-group">
  <label class="form-label">Email</label>
  <input type="email" class="form-input" placeholder="Enter your email">
</div>

<!-- Alert -->
<div class="alert alert-success">Operation completed successfully!</div>

<!-- Card -->
<div class="card-modern">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
  </div>
  <div class="card-body">
    <p>Card content goes here...</p>
  </div>
</div>
```

## Customization

To customize the design system, modify the variables in `variables.css`. All components use these variables, so changes will propagate throughout the application.