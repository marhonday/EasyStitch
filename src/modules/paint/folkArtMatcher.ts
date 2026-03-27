/**
 * Folk Art acrylic paint colour matcher.
 * Folk Art by Plaid is the most widely available craft paint brand
 * (Walmart, Michaels, Hobby Lobby, Amazon) and is the de-facto standard
 * for beginner/intermediate paint-by-number projects.
 *
 * Matching uses RGB Euclidean distance — same approach as DMC matching.
 */

export interface FolkArtColor {
  name:  string
  hex:   string
  r:     number
  g:     number
  b:     number
}

// ─── Folk Art colour database (~80 colours covering the full spectrum) ─────────

export const FOLK_ART_COLORS: FolkArtColor[] = [
  // Whites & Neutrals
  { name: 'Wicker White',      hex: '#F2EDE4', r: 242, g: 237, b: 228 },
  { name: 'Pure White',        hex: '#F7F5F0', r: 247, g: 245, b: 240 },
  { name: 'Warm White',        hex: '#EDE8DC', r: 237, g: 232, b: 220 },
  { name: 'Linen',             hex: '#D4C4A8', r: 212, g: 196, b: 168 },
  { name: 'Almond Parfait',    hex: '#C8B090', r: 200, g: 176, b: 144 },
  { name: 'Mushroom',          hex: '#9A8878', r: 154, g: 136, b: 120 },
  { name: 'Sterling Gray',     hex: '#C4C4C4', r: 196, g: 196, b: 196 },
  { name: 'Medium Gray',       hex: '#8A8A8A', r: 138, g: 138, b: 138 },
  { name: 'Dove Gray',         hex: '#9B9B9B', r: 155, g: 155, b: 155 },
  { name: 'Charcoal Gray',     hex: '#4A4A4A', r: 74,  g: 74,  b: 74  },
  { name: 'Wrought Iron',      hex: '#3A3A3A', r: 58,  g: 58,  b: 58  },
  { name: 'Licorice',          hex: '#2A1A1A', r: 42,  g: 26,  b: 26  },
  { name: 'Pure Black',        hex: '#1C1C1C', r: 28,  g: 28,  b: 28  },

  // Reds & Pinks
  { name: 'Engine Red',        hex: '#BE1E2D', r: 190, g: 30,  b: 45  },
  { name: 'Cardinal Red',      hex: '#9B1B30', r: 155, g: 27,  b: 48  },
  { name: 'Barn Red',          hex: '#7C2128', r: 124, g: 33,  b: 40  },
  { name: 'Tomato Red',        hex: '#CE3728', r: 206, g: 55,  b: 40  },
  { name: 'Rose Pink',         hex: '#E4748A', r: 228, g: 116, b: 138 },
  { name: 'Blush',             hex: '#E8A0A0', r: 232, g: 160, b: 160 },
  { name: 'Hot Pink',          hex: '#D4366A', r: 212, g: 54,  b: 106 },
  { name: 'Magenta',           hex: '#C42A7A', r: 196, g: 42,  b: 122 },
  { name: 'Raspberry Sherbet', hex: '#D44A7A', r: 212, g: 74,  b: 122 },

  // Oranges
  { name: 'Orange',            hex: '#E8631A', r: 232, g: 99,  b: 26  },
  { name: 'Tangerine',         hex: '#F5811F', r: 245, g: 129, b: 31  },
  { name: 'Pumpkin',           hex: '#D46020', r: 212, g: 96,  b: 32  },
  { name: 'Terra Cotta',       hex: '#C4643C', r: 196, g: 100, b: 60  },
  { name: 'Burnt Sienna',      hex: '#8C4A2F', r: 140, g: 74,  b: 47  },

  // Yellows
  { name: 'Yellow Light',      hex: '#F9E04B', r: 249, g: 224, b: 75  },
  { name: 'School Bus Yellow', hex: '#F5C518', r: 245, g: 197, b: 24  },
  { name: 'Sunflower',         hex: '#E8B820', r: 232, g: 184, b: 32  },
  { name: 'Yellow Ochre',      hex: '#C49A2A', r: 196, g: 154, b: 42  },
  { name: 'Raw Sienna',        hex: '#A0692A', r: 160, g: 105, b: 42  },

  // Browns & Tans
  { name: 'Camel',             hex: '#C4904A', r: 196, g: 144, b: 74  },
  { name: 'Butter Pecan',      hex: '#D4A870', r: 212, g: 168, b: 112 },
  { name: 'Teddy Bear Tan',    hex: '#B8894E', r: 184, g: 137, b: 78  },
  { name: 'Cappuccino',        hex: '#9E7057', r: 158, g: 112, b: 87  },
  { name: 'Nutmeg',            hex: '#7D4E2A', r: 125, g: 78,  b: 42  },
  { name: 'Raw Umber',         hex: '#7A5A3A', r: 122, g: 90,  b: 58  },
  { name: 'Espresso',          hex: '#4A2C1A', r: 74,  g: 44,  b: 26  },

  // Greens
  { name: 'Spring Green',      hex: '#8AC45A', r: 138, g: 196, b: 90  },
  { name: 'Clover',            hex: '#5A8A4A', r: 90,  g: 138, b: 74  },
  { name: 'Garden Green',      hex: '#4A7A3A', r: 74,  g: 122, b: 58  },
  { name: 'Hauser Lt Green',   hex: '#7A9A5A', r: 122, g: 154, b: 90  },
  { name: 'Hauser Med Green',  hex: '#5A7A3A', r: 90,  g: 122, b: 58  },
  { name: 'Thicket',           hex: '#4A5E3A', r: 74,  g: 94,  b: 58  },
  { name: 'Forest Green',      hex: '#2D5934', r: 45,  g: 89,  b: 52  },
  { name: 'Basil',             hex: '#3D5F38', r: 61,  g: 95,  b: 56  },
  { name: 'Bayberry',          hex: '#5A7A6A', r: 90,  g: 122, b: 106 },

  // Blues
  { name: 'Baby Blue',         hex: '#7AAAC4', r: 122, g: 170, b: 196 },
  { name: 'Periwinkle',        hex: '#7A80C4', r: 122, g: 128, b: 196 },
  { name: 'Denim Blue',        hex: '#3A5A8A', r: 58,  g: 90,  b: 138 },
  { name: 'Cobalt Blue',       hex: '#2A4A8A', r: 42,  g: 74,  b: 138 },
  { name: 'Thunder Blue',      hex: '#3A4A6A', r: 58,  g: 74,  b: 106 },
  { name: 'Navy Blue',         hex: '#1A2A5A', r: 26,  g: 42,  b: 90  },

  // Purples
  { name: 'Wisteria',          hex: '#9A7AC4', r: 154, g: 122, b: 196 },
  { name: 'Violet Pansy',      hex: '#5A2A8A', r: 90,  g: 42,  b: 138 },
  { name: 'Plum',              hex: '#5A1A5A', r: 90,  g: 26,  b: 90  },

  // Teals & Aquas
  { name: 'Turquoise',         hex: '#3AB4C4', r: 58,  g: 180, b: 196 },
  { name: 'Teal',              hex: '#2A7A7A', r: 42,  g: 122, b: 122 },
  { name: 'Aqua',              hex: '#5AC4C4', r: 90,  g: 196, b: 196 },

  // Metallics (common in craft painting)
  { name: 'Copper (Metallic)', hex: '#C47040', r: 196, g: 112, b: 64  },
  { name: 'Silver (Metallic)', hex: '#B8B8C0', r: 184, g: 184, b: 192 },
  { name: 'Gold (Metallic)',   hex: '#C8A840', r: 200, g: 168, b: 64  },
]

// ─── Matcher ──────────────────────────────────────────────────────────────────

function rgbDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2)
}

export function matchToFolkArt(hex: string): FolkArtColor {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)

  let best = FOLK_ART_COLORS[0]
  let bestDist = Infinity

  for (const color of FOLK_ART_COLORS) {
    const d = rgbDistance(r, g, b, color.r, color.g, color.b)
    if (d < bestDist) { bestDist = d; best = color }
  }

  return best
}
