/**
 * Country and sector option lists for the profile form. Extracted from the old
 * `CreateProfile` page so the wizard and the section editor cannot drift apart —
 * a sector present in one form and missing from the other silently corrupts
 * matching, which reads `profiles.sector` as free text.
 */

export const AFRICAN_COUNTRIES = [
  "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon","Central African Republic","Chad","Comoros","Congo (Brazzaville)","Congo (DRC)","Côte d'Ivoire","Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda","São Tomé and Príncipe","Senegal","Seychelles","Sierra Leone","Somalia","South Africa","South Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe","Other",
];

export const SECTORS = [
  "Agriculture & Agritech","Fashion & Apparel","Food & Beverage","Retail & E-commerce","Logistics & Supply Chain","Manufacturing","Construction & Real Estate","Financial Services & Fintech","Health & Wellness","Healthtech & Pharma","Education & Edtech","Media, Arts & Entertainment","Beauty & Personal Care","Hospitality & Tourism","Professional Services","Marketing & Creative","Technology & Software","Energy & Cleantech","Transportation & Mobility","Automotive","Telecommunications","Import / Export & Trade","Mining & Natural Resources","Non-profit & Social Enterprise","Other",
];
