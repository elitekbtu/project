// Новая система из 5 категорий образа
export const CLOTHING_TYPES = [
  'top',
  'bottom', 
  'footwear',
  'accessory',
  'fragrance',
] as const;
export type ClothingType = (typeof CLOTHING_TYPES)[number]; 

// Маппинг для отображения названий категорий на русском языке
export const CATEGORY_LABELS: Record<string, string> = {
  top: 'Верх',
  bottom: 'Низ',
  footwear: 'Обувь',
  accessory: 'Аксессуары',
  fragrance: 'Ароматы',
};

// Детальные подкатегории для каждой из 5 основных категорий
export const CATEGORY_DETAILS: Record<string, string[]> = {
  top: ['футболка', 'рубашка', 'худи', 'свитер', 'куртка', 'пальто', 'платье', 'лонгслив', 'поло'],
  bottom: ['джинсы', 'штаны', 'шорты', 'юбка', 'леггинсы', 'лосины'],
  footwear: ['кроссовки', 'ботинки', 'туфли', 'сапоги', 'босоножки', 'сандалии', 'кеды'],
  accessory: ['сумка', 'рюкзак', 'ремень', 'часы', 'очки', 'шарф', 'шапка', 'украшения'],
  fragrance: ['духи', 'парфюм', 'туалетная вода', 'одеколон', 'масло эфирное'],
}; 