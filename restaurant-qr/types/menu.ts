export type MenuCategory = {
  id?: string;
  name: string;
  slug?: string;
} | string | null;

export interface MenuItem {
  id: string | number;
  name: string;
  price: number;
  quantity?: number;
  description?: string;
  category?: MenuCategory;
  isAvailable?: boolean;
}
