/**
 * Standardized Indian States and Cities Geographic Dataset
 * Tailored for Delivshop Cold Chain & Retail Fleet Management
 */

export interface LocationEntry {
  city: string;
  state: string;
}

export const STATE_CITY_MAP: Record<string, string[]> = {
  Maharashtra: [
    'Pune',
    'Mumbai',
    'Nashik',
    'Nagpur',
    'Aurangabad (Chhatrapati Sambhajinagar)',
    'Thane',
    'Solapur',
    'Kolhapur',
    'Amravati',
    'Nanded',
    'Jalgaon',
    'Akola',
    'Latur',
    'Dhule',
    'Ahmednagar (Ahilyanagar)',
    'Chandrapur',
    'Parbhani',
    'Sangli',
    'Jalna',
    'Satara',
    'Navi Mumbai',
    'Kalyan-Dombivli',
    'Vasai-Virar',
    'Pimpri-Chinchwad',
    'Panvel',
    'Mira-Bhayandar',
    'Bhiwandi',
    'Wardha',
    'Yavatmal',
    'Beed',
    'Gondia',
    'Baramati',
    'Malegaon',
    'Ichalkaranji',
  ],
  Gujarat: [
    'Ahmedabad',
    'Surat',
    'Vadodara',
    'Rajkot',
    'Bhavnagar',
    'Jamnagar',
    'Gandhinagar',
    'Junagadh',
    'Anand',
    'Navsari',
    'Bharuch',
    'Vapi',
    'Mehsana',
    'Morbi',
  ],
  Karnataka: [
    'Bengaluru',
    'Mysuru',
    'Hubballi-Dharwad',
    'Mangaluru',
    'Belagavi',
    'Kalaburagi',
    'Davanagere',
    'Ballari',
    'Vijayapura',
    'Shivamogga',
    'Tumakuru',
    'Bidar',
  ],
  Delhi: [
    'New Delhi',
    'North Delhi',
    'South Delhi',
    'East Delhi',
    'West Delhi',
    'Central Delhi',
    'Dwarka',
    'Rohini',
  ],
  Goa: [
    'Panaji',
    'Margao',
    'Vasco da Gama',
    'Mapusa',
    'Ponda',
  ],
  Telangana: [
    'Hyderabad',
    'Warangal',
    'Nizamabad',
    'Karimnagar',
    'Khammam',
    'Ramagundam',
    'Secunderabad',
  ],
  'Tamil Nadu': [
    'Chennai',
    'Coimbatore',
    'Madurai',
    'Tiruchirappalli',
    'Salem',
    'Tirunelveli',
    'Erode',
    'Vellore',
    'Thoothukudi',
  ],
  'Madhya Pradesh': [
    'Indore',
    'Bhopal',
    'Jabalpur',
    'Gwalior',
    'Ujjain',
    'Sagar',
    'Dewas',
    'Satna',
    'Ratlam',
  ],
  Rajasthan: [
    'Jaipur',
    'Jodhpur',
    'Kota',
    'Bikaner',
    'Ajmer',
    'Udaipur',
    'Bhilwara',
    'Alwar',
    'Sikar',
  ],
  'Uttar Pradesh': [
    'Lucknow',
    'Kanpur',
    'Ghaziabad',
    'Agra',
    'Varanasi',
    'Meerut',
    'Prayagraj',
    'Noida',
    'Bareilly',
    'Aligarh',
    'Moradabad',
    'Saharanpur',
    'Gorakhpur',
  ],
  Punjab: [
    'Ludhiana',
    'Amritsar',
    'Jalandhar',
    'Patiala',
    'Bathinda',
    'Mohali',
  ],
  Haryana: [
    'Gurugram',
    'Faridabad',
    'Panipat',
    'Ambala',
    'Yamunanagar',
    'Rohtak',
    'Hisar',
    'Karnal',
    'Panchkula',
  ],
  'West Bengal': [
    'Kolkata',
    'Howrah',
    'Asansol',
    'Siliguri',
    'Durgapur',
  ],
  Kerala: [
    'Thiruvananthapuram',
    'Kochi',
    'Kozhikode',
    'Kollam',
    'Thrissur',
    'Kannur',
  ],
  'Andhra Pradesh': [
    'Visakhapatnam',
    'Vijayawada',
    'Guntur',
    'Nellore',
    'Kurnool',
    'Tirupati',
  ],
};

export const INDIAN_STATES: string[] = Object.keys(STATE_CITY_MAP).sort();

export function getAllIndianStates(): string[] {
  return INDIAN_STATES;
}

export function getCitiesForState(state: string): string[] {
  const match = Object.keys(STATE_CITY_MAP).find(
    (s) => s.toLowerCase() === state.trim().toLowerCase()
  );
  return match ? STATE_CITY_MAP[match] : [];
}

export function getStateForCity(city: string): string | undefined {
  const cleanCity = city.trim().toLowerCase();
  for (const [state, cities] of Object.entries(STATE_CITY_MAP)) {
    if (
      cities.some(
        (c) =>
          c.toLowerCase() === cleanCity ||
          c.toLowerCase().startsWith(cleanCity) ||
          cleanCity.startsWith(c.toLowerCase().split(' ')[0])
      )
    ) {
      return state;
    }
  }
  return undefined;
}

export function searchCities(
  query: string,
  stateFilter?: string
): LocationEntry[] {
  const q = query.trim().toLowerCase();
  const results: LocationEntry[] = [];

  const statesToSearch =
    stateFilter && stateFilter.trim() && STATE_CITY_MAP[stateFilter.trim()]
      ? [stateFilter.trim()]
      : Object.keys(STATE_CITY_MAP);

  for (const state of statesToSearch) {
    const cities = STATE_CITY_MAP[state] || [];
    for (const city of cities) {
      if (!q || city.toLowerCase().includes(q)) {
        results.push({ city, state });
      }
    }
  }

  // Sort: exact matches first, then startsWith, then alphabetical
  return results.sort((a, b) => {
    const aLower = a.city.toLowerCase();
    const bLower = b.city.toLowerCase();
    const aStarts = aLower.startsWith(q);
    const bStarts = bLower.startsWith(q);

    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.city.localeCompare(b.city);
  });
}

export function searchStates(query: string): string[] {
  const q = query.trim().toLowerCase();
  return INDIAN_STATES.filter((s) => !q || s.toLowerCase().includes(q)).sort(
    (a, b) => {
      const aStarts = a.toLowerCase().startsWith(q);
      const bStarts = b.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.localeCompare(b);
    }
  );
}

export function isValidState(state: string): boolean {
  if (!state) return false;
  return INDIAN_STATES.some(
    (s) => s.toLowerCase() === state.trim().toLowerCase()
  );
}

export function isValidCity(city: string, state?: string): boolean {
  if (!city) return false;
  const cleanCity = city.trim().toLowerCase();

  if (state && STATE_CITY_MAP[state.trim()]) {
    return (STATE_CITY_MAP[state.trim()] || []).some(
      (c) => c.toLowerCase() === cleanCity
    );
  }

  for (const cities of Object.values(STATE_CITY_MAP)) {
    if (cities.some((c) => c.toLowerCase() === cleanCity)) {
      return true;
    }
  }
  return false;
}
