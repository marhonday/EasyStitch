/**
 * dmcColors.ts
 * Standard DMC thread / diamond painting color reference.
 * ~170 colors covering the full spectrum.
 * Hex values are representative — slight dye-lot variation exists in real life.
 */

export interface DmcColor {
  code: string
  name: string
  hex:  string
  r:    number
  g:    number
  b:    number
}

function h(hex: string, code: string, name: string): DmcColor {
  const n = parseInt(hex.slice(1), 16)
  return { code, name, hex, r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export const DMC_COLORS: DmcColor[] = [
  // ── Whites & Near-Whites ──────────────────────────────────────────────────
  h('#FFFFFF', 'B5200', 'Snow White'),
  h('#FFFEF7', 'White', 'White'),
  h('#F0E4C2', 'Ecru',  'Ecru'),

  // ── Blacks & Grays ────────────────────────────────────────────────────────
  h('#000000', '310',  'Black'),
  h('#3D3D3D', '3799', 'Very Dark Pewter Gray'),
  h('#545454', '413',  'Dark Pewter Gray'),
  h('#6B6B6B', '317',  'Pewter Gray'),
  h('#858585', '414',  'Dark Steel Gray'),
  h('#9A9A9A', '318',  'Light Steel Gray'),
  h('#B8B8B8', '415',  'Pearl Gray'),
  h('#D8D8D8', '762',  'Very Light Pearl Gray'),
  h('#E8E4DC', '3072', 'Very Light Beaver Gray'),

  // ── Browns ────────────────────────────────────────────────────────────────
  h('#1C100A', '3371', 'Black Brown'),
  h('#2C1810', '938',  'Ultra Dark Coffee Brown'),
  h('#5C2E18', '801',  'Dark Coffee Brown'),
  h('#3E2010', '838',  'Very Dark Beige Brown'),
  h('#7A3B1E', '433',  'Medium Brown'),
  h('#9A5528', '434',  'Light Brown'),
  h('#B8712E', '435',  'Very Light Brown'),
  h('#CC9040', '436',  'Tan'),
  h('#DCB06A', '437',  'Light Tan'),
  h('#EED09A', '738',  'Very Light Tan'),
  h('#F8EAC8', '739',  'Ultra Very Light Tan'),
  h('#7A3828', '3772', 'Very Dark Desert Sand'),
  h('#A86048', '3773', 'Medium Desert Sand'),
  h('#F0D4B8', '3774', 'Very Light Desert Sand'),
  h('#9A5840', '407',  'Dark Desert Sand'),

  // ── Reds ──────────────────────────────────────────────────────────────────
  h('#780020', '814',  'Dark Garnet'),
  h('#9A1028', '815',  'Medium Garnet'),
  h('#B01828', '816',  'Garnet'),
  h('#8C1020', '498',  'Dark Red'),
  h('#B41828', '304',  'Medium Red'),
  h('#CC2028', '321',  'Red'),
  h('#B01818', '817',  'Very Dark Coral Red'),
  h('#C03030', '347',  'Very Dark Salmon'),
  h('#C83828', '349',  'Dark Coral'),
  h('#D45050', '350',  'Medium Coral'),
  h('#DC7878', '351',  'Coral'),
  h('#E89898', '352',  'Light Coral'),
  h('#F8B8A0', '353',  'Peach'),

  // ── Pinks & Roses ─────────────────────────────────────────────────────────
  h('#AC2040', '326',  'Very Dark Rose'),
  h('#E06880', '899',  'Medium Rose'),
  h('#F8A8B8', '957',  'Pale Geranium'),
  h('#F09090', '3706', 'Medium Melon'),
  h('#D03060', '3801', 'Very Dark Melon'),
  h('#C81860', '3804', 'Dark Cyclamen Pink'),
  h('#DC3080', '3805', 'Cyclamen Pink'),
  h('#7A1858', '718',  'Plum'),
  h('#8C2870', '917',  'Medium Plum'),
  h('#780850', '915',  'Dark Plum'),
  h('#C87080', '961',  'Dark Dusty Rose'),
  h('#E890C0', '3608', 'Very Light Plum'),
  h('#F8E0E0', '819',  'Light Baby Pink'),

  // ── Oranges ───────────────────────────────────────────────────────────────
  h('#E84818', '608',  'Bright Orange'),
  h('#E03010', '606',  'Bright Orange-Red'),
  h('#C04010', '900',  'Dark Burnt Orange'),
  h('#D05018', '946',  'Medium Burnt Orange'),
  h('#E06820', '947',  'Burnt Orange'),
  h('#D06010', '971',  'Pumpkin'),
  h('#E07820', '970',  'Light Pumpkin'),
  h('#F07020', '740',  'Tangerine'),
  h('#F08830', '741',  'Medium Tangerine'),
  h('#F0A040', '742',  'Light Tangerine'),
  h('#F8C050', '743',  'Medium Yellow'),
  h('#FCDC88', '744',  'Pale Yellow'),
  h('#FEF0B0', '745',  'Light Pale Yellow'),

  // ── Yellows ───────────────────────────────────────────────────────────────
  h('#FCEC40', '307',  'Lemon'),
  h('#F8C020', '444',  'Dark Lemon'),
  h('#FEF478', '445',  'Light Lemon'),
  h('#FCC840', '726',  'Light Topaz'),
  h('#F8B820', '725',  'Topaz'),
  h('#D49418', '783',  'Medium Topaz'),
  h('#BC7810', '782',  'Dark Topaz'),
  h('#A06008', '781',  'Very Dark Topaz'),
  h('#D08020', '977',  'Light Golden Brown'),
  h('#C07018', '976',  'Medium Golden Brown'),
  h('#A05008', '975',  'Dark Golden Brown'),
  h('#D4A828', '3820', 'Dark Straw'),
  h('#E8C040', '3821', 'Straw'),
  h('#F8DC80', '3822', 'Light Straw'),
  h('#FFF8D8', '3823', 'Ultra Pale Yellow'),

  // ── Greens ────────────────────────────────────────────────────────────────
  h('#1C3818', '895',  'Very Dark Hunter Green'),
  h('#1A3828', '500',  'Very Dark Blue Green'),
  h('#285840', '501',  'Dark Blue Green'),
  h('#487858', '502',  'Blue Green'),
  h('#78A880', '503',  'Medium Blue Green'),
  h('#B0D0B8', '504',  'Very Light Blue Green'),
  h('#0C6030', '909',  'Very Dark Emerald Green'),
  h('#186838', '910',  'Dark Emerald Green'),
  h('#208048', '911',  'Medium Emerald Green'),
  h('#38A860', '912',  'Light Emerald Green'),
  h('#70B878', '913',  'Medium Nile Green'),
  h('#90C890', '954',  'Nile Green'),
  h('#B8E0B8', '955',  'Light Nile Green'),
  h('#3C7010', '904',  'Very Dark Parrot Green'),
  h('#509018', '905',  'Dark Parrot Green'),
  h('#70B828', '906',  'Medium Parrot Green'),
  h('#98D040', '907',  'Light Parrot Green'),
  h('#285820', '319',  'Very Dark Pistachio Green'),
  h('#487840', '367',  'Dark Pistachio Green'),
  h('#588848', '320',  'Medium Pistachio Green'),
  h('#88B878', '368',  'Light Pistachio Green'),
  h('#C0E0B0', '369',  'Very Light Pistachio Green'),
  h('#285810', '3345', 'Dark Hunter Green'),
  h('#487028', '3346', 'Hunter Green'),
  h('#709840', '3347', 'Medium Yellow Green'),
  h('#A8C878', '3348', 'Light Yellow Green'),
  h('#A0B830', '166',  'Medium Light Moss Green'),
  h('#68A880', '3816', 'Celadon Green'),
  h('#98C8A0', '3817', 'Light Celadon Green'),
  h('#387870', '3814', 'Aquamarine'),
  h('#608868', '163',  'Medium Celadon Green'),

  // ── Blues ─────────────────────────────────────────────────────────────────
  h('#101860', '823',  'Dark Navy Blue'),
  h('#182880', '336',  'Navy Blue'),
  h('#101898', '820',  'Very Dark Royal Blue'),
  h('#1030B0', '796',  'Dark Royal Blue'),
  h('#1840C0', '797',  'Royal Blue'),
  h('#3060C0', '798',  'Dark Delft Blue'),
  h('#5080D0', '799',  'Medium Delft Blue'),
  h('#98B8E0', '800',  'Pale Delft Blue'),
  h('#183880', '311',  'Medium Navy Blue'),
  h('#2050A0', '312',  'Very Dark Baby Blue'),
  h('#4070B8', '322',  'Dark Baby Blue'),
  h('#4860C0', '3838', 'Dark Lavender Blue'),
  h('#7080D0', '3839', 'Medium Lavender Blue'),
  h('#A0B0E8', '3840', 'Light Lavender Blue'),
  h('#4878C0', '826',  'Medium Blue'),
  h('#2860B0', '825',  'Dark Blue'),
  h('#C0D8F0', '827',  'Very Light Blue'),
  h('#D8EAF8', '828',  'Ultra Very Light Baby Blue'),
  h('#2068A0', '517',  'Dark Wedgwood'),
  h('#4090C0', '518',  'Light Wedgwood'),
  h('#78B0D0', '519',  'Sky Blue'),
  h('#D8F0F8', '747',  'Very Light Sky Blue'),
  h('#1880A0', '3765', 'Very Dark Peacock Blue'),
  h('#60B0C8', '3766', 'Light Peacock Blue'),
  h('#48A0C0', '597',  'Turquoise'),
  h('#78C0D0', '598',  'Light Turquoise'),
  h('#286080', '3808', 'Ultra Very Dark Turquoise'),
  h('#B8E0E8', '3811', 'Very Light Turquoise'),
  h('#1090E0', '3843', 'Electric Blue'),
  h('#D8E4F0', '3753', 'Ultra Very Light Antique Blue'),

  // ── Purples & Lavenders ───────────────────────────────────────────────────
  h('#480858', '550',  'Very Dark Violet'),
  h('#6C3080', '552',  'Medium Violet'),
  h('#9060A0', '553',  'Violet'),
  h('#C098D0', '554',  'Light Violet'),
  h('#581070', '327',  'Very Dark Violet'),
  h('#501870', '3837', 'Ultra Dark Lavender'),
  h('#906098', '3835', 'Medium Grape'),
  h('#B888C0', '3836', 'Light Grape'),
  h('#703880', '3834', 'Dark Grape'),
  h('#7A4888', '208',  'Very Dark Lavender'),
  h('#9868A8', '209',  'Dark Lavender'),
  h('#B890C8', '210',  'Medium Lavender'),
  h('#D8B8E0', '211',  'Light Lavender'),
  h('#483878', '333',  'Very Dark Blue Violet'),
  h('#8870B8', '340',  'Medium Blue Violet'),
  h('#A898D0', '341',  'Light Blue Violet'),
  h('#6050A8', '3746', 'Dark Blue Violet'),

  // ── Skin Tones ────────────────────────────────────────────────────────────
  h('#E8B88A', '945',  'Tawny'),
  h('#F4D0A8', '951',  'Light Tawny'),
  h('#F8D8B8', '3856', 'Ultra Very Light Mahogany'),
  h('#FEE8D8', '948',  'Very Light Peach'),
  h('#F8C8B0', '754',  'Light Peach'),
  h('#E8A888', '758',  'Very Light Terra Cotta'),
  h('#D08070', '3778', 'Light Terra Cotta'),
  h('#B86050', '356',  'Medium Terra Cotta'),
  h('#984030', '355',  'Dark Terra Cotta'),
  h('#AA5040', '3830', 'Terra Cotta'),
]
