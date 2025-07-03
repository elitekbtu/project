export interface ProfileOut {
  id: number;
  email: string;
  avatar?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  height?: number;
  weight?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  favorite_colors?: string | string[];
  favorite_brands?: string | string[];
  is_admin?: boolean;
}

export interface TokensUserOut {
  access_token: string;
  token_type: string;
  refresh_token: string;
  user: ProfileOut;
}

export interface UserOut {
  id: number;
  email: string;
  is_admin: boolean;
  is_active: boolean;
}

export interface UserCreateAdmin {
  email: string;
  password: string;
  is_admin?: boolean;
  is_active?: boolean;
}

export interface UserUpdateAdmin {
  email?: string;
  password?: string;
  is_admin?: boolean;
  is_active?: boolean;
}

export interface VariantOut {
  size?: string;
  color?: string;
  sku?: string;
  stock?: number;
  price?: number;
  id: number;
}

export interface ItemOut {
  name: string;
  brand?: string;
  color?: string;
  image_url?: string;
  description?: string;
  price?: number;
  category?: string;
  clothing_type?: string;
  article?: string;
  size?: string;
  style?: string;
  collection?: string;
  id: number;
  created_at?: string;
  updated_at?: string;
  image_urls?: string[];
  variants?: VariantOut[];
  is_favorite?: boolean;
}

export interface OutfitItemBase {
  id: number;
  name: string;
  brand?: string;
  image_url?: string;
  price?: number;
}

export interface OutfitOut {
  id: number;
  name: string;
  style: string;
  description?: string;
  // Убрано поле collection - коллекции больше не используются
  owner_id: string;
  created_at?: string;
  updated_at?: string;
  top?: OutfitItemBase[];
  bottom?: OutfitItemBase[];
  footwear?: OutfitItemBase[];
  accessory?: OutfitItemBase[];
  fragrance?: OutfitItemBase[];
  total_price?: number;
}

export interface ProfileUpdate {
  avatar?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  height?: number;
  weight?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  favorite_colors?: string | string[];
  favorite_brands?: string | string[];
}

export interface CartItemOut {
  item_id: number;
  variant_id: number;
  name: string;
  brand?: string;
  image_url?: string;
  size?: string;
  color?: string;
  sku?: string;
  quantity: number;
  price?: number;
  stock?: number;
}

export interface CartStateOut {
  items: CartItemOut[];
  total_items: number;
  total_price: number;
}

export interface OutfitCreate {
  name: string;
  style: string;
  description?: string;
  // Убрано поле collection - коллекции больше не используются
  top_ids?: number[];
  bottom_ids?: number[];
  footwear_ids?: number[];
  accessories_ids?: number[];
  fragrances_ids?: number[];
}

export interface OutfitUpdate {
  name?: string;
  style?: string;
  description?: string;
  // Убрано поле collection - коллекции больше не используются
  top_ids?: number[];
  bottom_ids?: number[];
  footwear_ids?: number[];
  accessories_ids?: number[];
  fragrances_ids?: number[];
}

export interface OutfitCommentCreate {
  content: string;
  rating?: number;
}

export interface OutfitCommentOut {
  content: string;
  rating?: number;
  id: number;
  user_id: number;
  created_at: string;
  likes: number;
}

export interface ItemUpdate {
  name?: string;
  brand?: string;
  color?: string;
  image_url?: string;
  description?: string;
  price?: number;
  category?: string;
  clothing_type?: string;
  article?: string;
  size?: string;
  style?: string;
  collection?: string;
}

export interface CommentCreate {
  content: string;
  rating?: number;
}

export interface CommentOut {
  content: string;
  rating?: number;
  id: number;
  user_id: number;
  user_name?: string;
  created_at: string;
  likes: number;
}

export interface VariantCreate {
  size?: string;
  color?: string;
  sku?: string;
  stock?: number;
  price?: number;
}

export interface VariantUpdate {
  size?: string;
  color?: string;
  sku?: string;
  stock?: number;
  price?: number;
}

export interface Body_create_item_api_items__post {
  name: string;
  brand?: string;
  color?: string;
  description?: string;
  price?: number;
  category?: string;
  article?: string;
  size?: string;
  style?: string;
  collection?: string;
  images?: File[];
  image_url?: string;
  clothing_type?: string;
} 