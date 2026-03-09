/**
 * BEA Regional Price Parities (RPP) for U.S. Metropolitan Statistical Areas.
 *
 * Source: Bureau of Economic Analysis, U.S. Department of Commerce
 * URL: https://www.bea.gov/data/prices-gdp/regional-price-parities-state-and-metro
 * Data year: 2023 (released December 2024)
 * Index: National average = 100.0. Higher = more expensive.
 *
 * Each entry includes match patterns for substring lookup against job location strings.
 * Patterns are lowercase. The first pattern is the canonical/primary match.
 */

export const RPP_DATA_YEAR = 2023;
export const RPP_NATIONAL_AVERAGE = 100.0;

export interface RppEntry {
  msa: string;
  rpp: number;
  patterns: string[];
}

export const RPP_ENTRIES: RppEntry[] = [
  // ── Tier 1: Very High Cost (RPP > 115) ──────────────────
  {
    msa: "San Jose-Sunnyvale-Santa Clara, CA",
    rpp: 125.1,
    patterns: ["san jose", "sunnyvale", "santa clara", "silicon valley", "cupertino", "mountain view", "palo alto"],
  },
  {
    msa: "San Francisco-Oakland-Berkeley, CA",
    rpp: 118.5,
    patterns: ["san francisco", "oakland", "berkeley", "sf bay", "soma"],
  },
  {
    msa: "New York-Newark-Jersey City, NY-NJ-PA",
    rpp: 122.3,
    patterns: ["new york", "nyc", "manhattan", "brooklyn", "newark", "jersey city", "queens", "bronx"],
  },
  {
    msa: "Honolulu, HI",
    rpp: 121.8,
    patterns: ["honolulu", "hawaii"],
  },
  {
    msa: "Los Angeles-Long Beach-Anaheim, CA",
    rpp: 116.2,
    patterns: ["los angeles", "long beach", "anaheim", "santa monica", "pasadena", "culver city", "la metro"],
  },
  {
    msa: "San Diego-Chula Vista-Carlsbad, CA",
    rpp: 117.8,
    patterns: ["san diego", "chula vista", "carlsbad"],
  },
  {
    msa: "Washington-Arlington-Alexandria, DC-VA-MD-WV",
    rpp: 115.4,
    patterns: ["washington, dc", "washington dc", "arlington, va", "arlington va", "alexandria, va", "bethesda", "mclean", "tysons", "reston"],
  },
  {
    msa: "Boston-Cambridge-Newton, MA-NH",
    rpp: 115.2,
    patterns: ["boston", "cambridge, ma", "cambridge ma", "newton, ma", "somerville, ma"],
  },

  // ── Tier 2: High Cost (RPP 108–115) ──────────────────
  {
    msa: "Seattle-Tacoma-Bellevue, WA",
    rpp: 112.9,
    patterns: ["seattle", "tacoma", "bellevue", "redmond", "kirkland", "bothell"],
  },
  {
    msa: "Bridgeport-Stamford-Norwalk, CT",
    rpp: 114.2,
    patterns: ["bridgeport", "stamford", "norwalk, ct"],
  },
  {
    msa: "Miami-Fort Lauderdale-Pompano Beach, FL",
    rpp: 110.5,
    patterns: ["miami", "fort lauderdale", "pompano beach", "boca raton", "doral"],
  },
  {
    msa: "Denver-Aurora-Lakewood, CO",
    rpp: 108.3,
    patterns: ["denver", "aurora, co", "lakewood, co", "boulder"],
  },
  {
    msa: "Portland-Vancouver-Hillsboro, OR-WA",
    rpp: 108.1,
    patterns: ["portland", "hillsboro", "beaverton", "vancouver, wa"],
  },
  {
    msa: "Philadelphia-Camden-Wilmington, PA-NJ-DE-MD",
    rpp: 108.7,
    patterns: ["philadelphia", "camden, nj", "wilmington, de"],
  },
  {
    msa: "Chicago-Naperville-Elgin, IL-IN-WI",
    rpp: 108.0,
    patterns: ["chicago", "naperville", "evanston", "elgin, il"],
  },
  {
    msa: "Hartford-East Hartford-Middletown, CT",
    rpp: 108.4,
    patterns: ["hartford"],
  },
  {
    msa: "Anchorage, AK",
    rpp: 109.4,
    patterns: ["anchorage", "alaska"],
  },
  {
    msa: "Sacramento-Roseville-Folsom, CA",
    rpp: 108.6,
    patterns: ["sacramento", "roseville, ca", "folsom"],
  },
  {
    msa: "Riverside-San Bernardino-Ontario, CA",
    rpp: 108.2,
    patterns: ["riverside", "san bernardino", "ontario, ca"],
  },

  // ── Tier 3: Above Average (RPP 103–108) ──────────────────
  {
    msa: "Austin-Round Rock-Georgetown, TX",
    rpp: 103.8,
    patterns: ["austin", "round rock"],
  },
  {
    msa: "Minneapolis-St. Paul-Bloomington, MN-WI",
    rpp: 105.2,
    patterns: ["minneapolis", "st. paul", "saint paul", "bloomington, mn"],
  },
  {
    msa: "Baltimore-Columbia-Towson, MD",
    rpp: 106.2,
    patterns: ["baltimore", "columbia, md", "towson"],
  },
  {
    msa: "Nashville-Davidson-Murfreesboro-Franklin, TN",
    rpp: 103.5,
    patterns: ["nashville", "franklin, tn", "murfreesboro"],
  },
  {
    msa: "Raleigh-Cary, NC",
    rpp: 103.7,
    patterns: ["raleigh", "cary, nc", "durham", "research triangle"],
  },
  {
    msa: "Charlotte-Concord-Gastonia, NC-SC",
    rpp: 103.2,
    patterns: ["charlotte", "concord, nc"],
  },
  {
    msa: "Dallas-Fort Worth-Arlington, TX",
    rpp: 103.4,
    patterns: ["dallas", "fort worth", "arlington, tx", "plano", "irving, tx", "frisco, tx"],
  },
  {
    msa: "Houston-The Woodlands-Sugar Land, TX",
    rpp: 103.1,
    patterns: ["houston", "the woodlands", "sugar land"],
  },
  {
    msa: "Atlanta-Sandy Springs-Alpharetta, GA",
    rpp: 104.6,
    patterns: ["atlanta", "sandy springs", "alpharetta", "marietta, ga"],
  },
  {
    msa: "Richmond, VA",
    rpp: 103.3,
    patterns: ["richmond, va", "richmond va"],
  },
  {
    msa: "Providence-Warwick, RI-MA",
    rpp: 104.8,
    patterns: ["providence", "warwick, ri"],
  },
  {
    msa: "New Haven-Milford, CT",
    rpp: 106.1,
    patterns: ["new haven"],
  },
  {
    msa: "Oxnard-Thousand Oaks-Ventura, CA",
    rpp: 107.4,
    patterns: ["oxnard", "thousand oaks", "ventura, ca"],
  },
  {
    msa: "Las Vegas-Henderson-Paradise, NV",
    rpp: 103.6,
    patterns: ["las vegas", "henderson, nv"],
  },
  {
    msa: "Trenton-Princeton, NJ",
    rpp: 106.8,
    patterns: ["trenton", "princeton"],
  },
  {
    msa: "Santa Rosa-Petaluma, CA",
    rpp: 107.2,
    patterns: ["santa rosa", "petaluma"],
  },

  // ── Tier 4: Near Average (RPP 98–103) ──────────────────
  {
    msa: "Phoenix-Mesa-Chandler, AZ",
    rpp: 101.8,
    patterns: ["phoenix", "mesa, az", "chandler, az", "scottsdale", "tempe"],
  },
  {
    msa: "San Antonio-New Braunfels, TX",
    rpp: 98.3,
    patterns: ["san antonio", "new braunfels"],
  },
  {
    msa: "Orlando-Kissimmee-Sanford, FL",
    rpp: 100.8,
    patterns: ["orlando", "kissimmee"],
  },
  {
    msa: "Tampa-St. Petersburg-Clearwater, FL",
    rpp: 100.6,
    patterns: ["tampa", "st. petersburg", "clearwater, fl"],
  },
  {
    msa: "Jacksonville, FL",
    rpp: 99.5,
    patterns: ["jacksonville, fl"],
  },
  {
    msa: "Columbus, OH",
    rpp: 99.7,
    patterns: ["columbus, oh", "columbus oh"],
  },
  {
    msa: "Pittsburgh, PA",
    rpp: 99.2,
    patterns: ["pittsburgh"],
  },
  {
    msa: "Detroit-Warren-Dearborn, MI",
    rpp: 99.8,
    patterns: ["detroit", "warren, mi", "dearborn", "ann arbor"],
  },
  {
    msa: "Milwaukee-Waukesha, WI",
    rpp: 100.3,
    patterns: ["milwaukee", "waukesha"],
  },
  {
    msa: "Kansas City, MO-KS",
    rpp: 98.9,
    patterns: ["kansas city"],
  },
  {
    msa: "Virginia Beach-Norfolk-Newport News, VA-NC",
    rpp: 100.2,
    patterns: ["virginia beach", "norfolk, va", "newport news"],
  },
  {
    msa: "New Orleans-Metairie, LA",
    rpp: 98.6,
    patterns: ["new orleans", "metairie"],
  },
  {
    msa: "Cleveland-Elyria, OH",
    rpp: 98.4,
    patterns: ["cleveland", "elyria"],
  },
  {
    msa: "Cincinnati, OH-KY-IN",
    rpp: 99.1,
    patterns: ["cincinnati"],
  },

  // ── Tier 5: Below Average (RPP 93–98) ──────────────────
  {
    msa: "Salt Lake City, UT",
    rpp: 101.2,
    patterns: ["salt lake", "slc", "utah", "lehi", "provo", "draper, ut", "orem"],
  },
  {
    msa: "Indianapolis-Carmel-Anderson, IN",
    rpp: 96.8,
    patterns: ["indianapolis", "carmel, in"],
  },
  {
    msa: "St. Louis, MO-IL",
    rpp: 96.5,
    patterns: ["st. louis", "saint louis"],
  },
  {
    msa: "Louisville/Jefferson County, KY-IN",
    rpp: 95.8,
    patterns: ["louisville"],
  },
  {
    msa: "Memphis, TN-MS-AR",
    rpp: 94.7,
    patterns: ["memphis"],
  },
  {
    msa: "Oklahoma City, OK",
    rpp: 94.2,
    patterns: ["oklahoma city"],
  },
  {
    msa: "Birmingham-Hoover, AL",
    rpp: 93.5,
    patterns: ["birmingham, al", "hoover, al"],
  },
  {
    msa: "Omaha-Council Bluffs, NE-IA",
    rpp: 95.3,
    patterns: ["omaha"],
  },
  {
    msa: "Tulsa, OK",
    rpp: 93.8,
    patterns: ["tulsa"],
  },
  {
    msa: "Boise City, ID",
    rpp: 97.4,
    patterns: ["boise"],
  },
  {
    msa: "Knoxville, TN",
    rpp: 93.9,
    patterns: ["knoxville"],
  },
  {
    msa: "El Paso, TX",
    rpp: 93.1,
    patterns: ["el paso"],
  },
  {
    msa: "Tucson, AZ",
    rpp: 96.2,
    patterns: ["tucson"],
  },
  {
    msa: "Albuquerque, NM",
    rpp: 95.6,
    patterns: ["albuquerque"],
  },
  {
    msa: "Buffalo-Cheektowaga, NY",
    rpp: 96.7,
    patterns: ["buffalo, ny", "cheektowaga"],
  },
  {
    msa: "Rochester, NY",
    rpp: 96.3,
    patterns: ["rochester, ny"],
  },
  {
    msa: "Reno-Sparks, NV",
    rpp: 102.1,
    patterns: ["reno"],
  },
  {
    msa: "Madison, WI",
    rpp: 102.8,
    patterns: ["madison, wi"],
  },
  {
    msa: "Des Moines-West Des Moines, IA",
    rpp: 96.4,
    patterns: ["des moines"],
  },
  {
    msa: "Wichita, KS",
    rpp: 93.4,
    patterns: ["wichita"],
  },
  {
    msa: "Little Rock-North Little Rock-Conway, AR",
    rpp: 93.2,
    patterns: ["little rock"],
  },
  {
    msa: "Spokane-Spokane Valley, WA",
    rpp: 97.8,
    patterns: ["spokane"],
  },
  {
    msa: "Greenville-Anderson, SC",
    rpp: 94.5,
    patterns: ["greenville, sc"],
  },
  {
    msa: "Chattanooga, TN-GA",
    rpp: 93.6,
    patterns: ["chattanooga"],
  },
  {
    msa: "Columbia, SC",
    rpp: 94.9,
    patterns: ["columbia, sc"],
  },

  // ── Tier 6: Low Cost (RPP < 93) ──────────────────
  {
    msa: "Huntsville, AL",
    rpp: 92.8,
    patterns: ["huntsville"],
  },
  {
    msa: "Lexington-Fayette, KY",
    rpp: 94.1,
    patterns: ["lexington, ky"],
  },
  {
    msa: "Jackson, MS",
    rpp: 88.5,
    patterns: ["jackson, ms"],
  },
  {
    msa: "McAllen-Edinburg-Mission, TX",
    rpp: 86.4,
    patterns: ["mcallen", "edinburg, tx"],
  },
];

/**
 * Baseline RPP used for the "1.0 multiplier" reference.
 * Setting this to 122.3 (NYC) makes NYC the benchmark for
 * the user's salary floor.
 */
export const RPP_BASELINE = 122.3;

/**
 * Remote work multiplier. Treating as ~110 RPP equivalent (0.9 of NYC).
 */
export const REMOTE_MULTIPLIER = 0.9;

/**
 * Default multiplier for unknown locations. Treating as ~104 RPP equivalent (0.85 of NYC).
 */
export const DEFAULT_MULTIPLIER = 0.85;
