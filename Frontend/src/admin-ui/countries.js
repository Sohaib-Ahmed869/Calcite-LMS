// Shared country list — used by the profile editor and the student form so the two stay in sync.
// Mirrors the dial-code list in admin-ui/fields.jsx (PhoneInput).
export const COUNTRY_NAMES = [
  'Australia', 'New Zealand', 'United Kingdom', 'United States', 'Canada', 'Ireland', 'India', 'Pakistan',
  'Bangladesh', 'Sri Lanka', 'Singapore', 'Malaysia', 'Indonesia', 'Philippines', 'China', 'Japan',
  'South Korea', 'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Turkey',
  'Egypt', 'South Africa', 'Kenya', 'Nigeria', 'Ghana', 'Germany', 'France', 'Italy', 'Spain', 'Portugal',
  'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland',
  'Greece', 'Brazil', 'Argentina', 'Mexico', 'Chile', 'Colombia', 'Fiji', 'Other',
];

// Ready for <CustomSelect options={...} />.
export const COUNTRIES = COUNTRY_NAMES.map((c) => ({ value: c, label: c }));

export default COUNTRIES;
