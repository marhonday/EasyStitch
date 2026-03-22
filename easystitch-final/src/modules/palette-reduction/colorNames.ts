/**
 * colorNames.ts
 *
 * Converts a hex color to a human-readable name using a curated
 * lookup table of ~140 named colors in LAB space.
 * Finds the perceptually closest match using Delta-E distance.
 *
 * No API needed — fully offline, instant.
 */

import { rgbToLab, labDistance } from './colorUtils'

interface NamedColor {
  name: string
  r: number
  g: number
  b: number
}

// Curated palette of craft-friendly color names
// Covers the range of colors that appear in crochet yarn
const NAMED_COLORS: NamedColor[] = [
  // Whites & creams
  { name: 'White',        r: 255, g: 255, b: 255 },
  { name: 'Cream',        r: 255, g: 253, b: 230 },
  { name: 'Ivory',        r: 255, g: 248, b: 220 },
  { name: 'Linen',        r: 240, g: 230, b: 210 },
  { name: 'Pearl',        r: 234, g: 224, b: 200 },

  // Greys
  { name: 'Light Grey',   r: 211, g: 211, b: 211 },
  { name: 'Silver',       r: 192, g: 192, b: 192 },
  { name: 'Grey',         r: 150, g: 150, b: 150 },
  { name: 'Charcoal',     r: 80,  g: 80,  b: 80  },
  { name: 'Ash',          r: 110, g: 110, b: 105 },

  // Blacks & near-blacks
  { name: 'Black',        r: 20,  g: 20,  b: 20  },
  { name: 'Espresso',     r: 42,  g: 30,  b: 20  },
  { name: 'Dark Brown',   r: 60,  g: 40,  b: 25  },

  // Browns
  { name: 'Chocolate',    r: 90,  g: 55,  b: 30  },
  { name: 'Coffee',       r: 120, g: 75,  b: 40  },
  { name: 'Caramel',      r: 175, g: 115, b: 55  },
  { name: 'Tan',          r: 200, g: 160, b: 110 },
  { name: 'Beige',        r: 220, g: 195, b: 160 },
  { name: 'Sand',         r: 210, g: 185, b: 140 },
  { name: 'Wheat',        r: 225, g: 198, b: 145 },
  { name: 'Buff',         r: 230, g: 210, b: 170 },
  { name: 'Mocha',        r: 140, g: 95,  b: 65  },
  { name: 'Walnut',       r: 100, g: 65,  b: 40  },
  { name: 'Sienna',       r: 160, g: 100, b: 60  },
  { name: 'Rust',         r: 183, g: 90,  b: 40  },
  { name: 'Copper',       r: 185, g: 115, b: 70  },
  { name: 'Terracotta',   r: 200, g: 120, b: 80  },

  // Reds
  { name: 'Red',          r: 220, g: 30,  b: 30  },
  { name: 'Crimson',      r: 185, g: 15,  b: 30  },
  { name: 'Cherry',       r: 210, g: 40,  b: 60  },
  { name: 'Rose Red',     r: 200, g: 55,  b: 70  },
  { name: 'Brick Red',    r: 175, g: 65,  b: 55  },
  { name: 'Burgundy',     r: 130, g: 30,  b: 45  },
  { name: 'Wine',         r: 115, g: 25,  b: 50  },
  { name: 'Maroon',       r: 110, g: 20,  b: 35  },

  // Pinks & corals
  { name: 'Pink',         r: 245, g: 140, b: 170 },
  { name: 'Light Pink',   r: 255, g: 185, b: 200 },
  { name: 'Blush',        r: 245, g: 195, b: 195 },
  { name: 'Dusty Rose',   r: 210, g: 150, b: 150 },
  { name: 'Mauve',        r: 185, g: 130, b: 145 },
  { name: 'Coral',        r: 240, g: 115, b: 95  },
  { name: 'Salmon',       r: 245, g: 155, b: 130 },
  { name: 'Peach',        r: 250, g: 190, b: 160 },

  // Oranges
  { name: 'Orange',       r: 240, g: 130, b: 30  },
  { name: 'Burnt Orange', r: 200, g: 95,  b: 30  },
  { name: 'Tangerine',    r: 245, g: 145, b: 55  },
  { name: 'Apricot',      r: 250, g: 185, b: 125 },
  { name: 'Pumpkin',      r: 210, g: 110, b: 40  },
  { name: 'Amber',        r: 215, g: 155, b: 30  },

  // Yellows
  { name: 'Yellow',       r: 250, g: 230, b: 40  },
  { name: 'Lemon',        r: 255, g: 245, b: 100 },
  { name: 'Butter',       r: 255, g: 240, b: 160 },
  { name: 'Mustard',      r: 210, g: 175, b: 40  },
  { name: 'Gold',         r: 205, g: 170, b: 35  },
  { name: 'Goldenrod',    r: 215, g: 180, b: 60  },
  { name: 'Straw',        r: 230, g: 210, b: 130 },

  // Greens
  { name: 'Lime',         r: 140, g: 210, b: 50  },
  { name: 'Grass Green',  r: 90,  g: 170, b: 60  },
  { name: 'Green',        r: 50,  g: 150, b: 50  },
  { name: 'Forest Green', r: 40,  g: 100, b: 50  },
  { name: 'Hunter Green', r: 35,  g: 85,  b: 50  },
  { name: 'Dark Green',   r: 25,  g: 70,  b: 40  },
  { name: 'Olive',        r: 110, g: 120, b: 50  },
  { name: 'Sage',         r: 140, g: 165, b: 120 },
  { name: 'Mint',         r: 160, g: 215, b: 175 },
  { name: 'Seafoam',      r: 145, g: 210, b: 185 },
  { name: 'Moss',         r: 100, g: 120, b: 75  },
  { name: 'Avocado',      r: 130, g: 145, b: 65  },
  { name: 'Fern',         r: 105, g: 150, b: 90  },
  { name: 'Jade',         r: 70,  g: 150, b: 110 },
  { name: 'Emerald',      r: 45,  g: 140, b: 90  },

  // Teals & aquas
  { name: 'Teal',         r: 45,  g: 140, b: 140 },
  { name: 'Dark Teal',    r: 30,  g: 100, b: 100 },
  { name: 'Aqua',         r: 80,  g: 195, b: 195 },
  { name: 'Turquoise',    r: 55,  g: 185, b: 185 },
  { name: 'Cyan',         r: 90,  g: 210, b: 220 },
  { name: 'Sky Blue',     r: 130, g: 200, b: 230 },

  // Blues
  { name: 'Light Blue',   r: 160, g: 205, b: 240 },
  { name: 'Baby Blue',    r: 185, g: 215, b: 240 },
  { name: 'Cornflower',   r: 100, g: 150, b: 220 },
  { name: 'Blue',         r: 55,  g: 100, b: 200 },
  { name: 'Royal Blue',   r: 50,  g: 80,  b: 190 },
  { name: 'Cobalt',       r: 40,  g: 65,  b: 175 },
  { name: 'Navy',         r: 25,  g: 40,  b: 110 },
  { name: 'Dark Navy',    r: 20,  g: 30,  b: 80  },
  { name: 'Denim',        r: 85,  g: 110, b: 165 },
  { name: 'Steel Blue',   r: 95,  g: 130, b: 170 },
  { name: 'Slate Blue',   r: 110, g: 120, b: 175 },
  { name: 'Periwinkle',   r: 150, g: 155, b: 220 },
  { name: 'Ice Blue',     r: 195, g: 215, b: 235 },

  // Purples & lavenders
  { name: 'Lavender',     r: 190, g: 175, b: 230 },
  { name: 'Lilac',        r: 200, g: 170, b: 215 },
  { name: 'Violet',       r: 155, g: 100, b: 210 },
  { name: 'Purple',       r: 130, g: 65,  b: 185 },
  { name: 'Dark Purple',  r: 95,  g: 40,  b: 145 },
  { name: 'Plum',         r: 110, g: 50,  b: 100 },
  { name: 'Eggplant',     r: 80,  g: 35,  b: 80  },
  { name: 'Grape',        r: 115, g: 55,  b: 130 },
  { name: 'Orchid',       r: 210, g: 130, b: 210 },
  { name: 'Wisteria',     r: 185, g: 155, b: 215 },
  { name: 'Mulberry',     r: 145, g: 65,  b: 115 },
  { name: 'Magenta',      r: 220, g: 20,  b: 160 },
  { name: 'Fuchsia',      r: 235, g: 50,  b: 185 },
  { name: 'Hot Pink',     r: 245, g: 90,  b: 170 },
  { name: 'Rose',         r: 225, g: 110, b: 160 },

  // Neutrals
  { name: 'Taupe',        r: 175, g: 155, b: 135 },
  { name: 'Mushroom',     r: 185, g: 170, b: 155 },
  { name: 'Stone',        r: 190, g: 180, b: 165 },
  { name: 'Pebble',       r: 160, g: 150, b: 135 },
  { name: 'Warm Grey',    r: 155, g: 145, b: 130 },
  { name: 'Cool Grey',    r: 145, g: 150, b: 160 },
]

// Pre-compute LAB values for all named colors at module load
const NAMED_COLORS_LAB = NAMED_COLORS.map(c => ({
  ...c,
  lab: rgbToLab(c.r, c.g, c.b),
}))

/**
 * Convert a hex color string to the nearest human-readable color name.
 * Uses perceptual Delta-E distance in LAB space.
 */
export function hexToColorName(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)

  if (isNaN(r) || isNaN(g) || isNaN(b)) return 'Unknown'

  const lab = rgbToLab(r, g, b)

  let bestName = 'Unknown'
  let bestDist = Infinity

  for (const named of NAMED_COLORS_LAB) {
    const dist = labDistance(lab, named.lab)
    if (dist < bestDist) {
      bestDist = dist
      bestName = named.name
    }
  }

  return bestName
}
