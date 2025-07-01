export const CLOTHING_TYPES = [
  'tshirt',
  'shirt',
  'hoodie',
  'sweater',
  'jacket',
  'coat',
  'dress',
  'pants',
  'jeans',
  'shorts',
  'skirt',
  'accessories',
  'footwear',
  'fragrances',
] as const;
export type ClothingType = (typeof CLOTHING_TYPES)[number]; 

// New: mapping to display category names in Russian with capital letters
export const CATEGORY_LABELS: Record<string, string> = {
  tshirt: 'Футболка',
  shirt: 'Рубашка',
  hoodie: 'Худи',
  sweater: 'Свитер',
  jacket: 'Куртка',
  coat: 'Пальто',
  dress: 'Платье',
  pants: 'Штаны',
  jeans: 'Джинсы',
  shorts: 'Шорты',
  skirt: 'Юбка',
  accessories: 'Аксессуары',
  footwear: 'Обувь',
  fragrances: 'Ароматы',
}; 