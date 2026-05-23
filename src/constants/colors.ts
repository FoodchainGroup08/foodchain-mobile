// FoodChain brand design system — mirrors the web frontend theme
export const Colors = {
  // Brand palette
  espresso:    '#3B2314',   // logo, headings, brand identity
  amber:       '#F0A500',   // CTAs, buttons, active tabs
  amberLight:  '#FEF3C7',   // tinted button/chip backgrounds
  burntOrange: '#E8622A',   // secondary accent, warnings
  sageGreen:   '#4CAF7D',   // success, "open" status

  // Semantic aliases (used throughout screens)
  primary:      '#F0A500',  // action colour — amber
  primaryDark:  '#3B2314',  // brand header colour — espresso
  primaryLight: '#FEF3C7',  // light amber tint

  background: '#FAF7F2',   // warm white page background
  surface:    '#FFFFFF',   // card / input surface
  inputBg:    '#F3F3F5',   // input field fill
  muted:      '#ECECF0',   // muted surface

  border:     'rgba(0,0,0,0.1)', // subtle dividers

  text:        '#1E1E1E',  // charcoal — primary text
  textMuted:   '#717182',  // secondary / label text
  textLight:   '#9CA3AF',  // placeholder / tertiary text

  success:  '#4CAF7D',     // sage green
  error:    '#D4183D',     // destructive red
  warning:  '#E8622A',     // burnt orange
  info:     '#2563EB',

  // Tab bar
  tabBar:         '#FFFFFF',
  tabBarActive:   '#F0A500',
  tabBarInactive: '#717182',

  // Order-status colours
  statusReceived:  '#2563EB',
  statusPreparing: '#E8622A',
  statusReady:     '#4CAF7D',
  statusCompleted: '#717182',
  statusCancelled: '#D4183D',
};

export const Fonts = {
  regular:    'Poppins_400Regular',
  medium:     'Poppins_500Medium',
  semiBold:   'Poppins_600SemiBold',
  bold:       'Poppins_700Bold',
};

// Border-radius scale — matches web --radius: 0.625rem (≈10 px)
export const Radius = {
  sm:  6,
  md:  10,
  lg:  14,
  xl:  20,
  full: 999,
};
