import burger from "@/assets/burger.jpg";
import fries from "@/assets/fries.jpg";
import pizza from "@/assets/pizza.jpg";
import cola from "@/assets/cola.jpg";
import chickenSandwich from "@/assets/chicken-sandwich.jpg";
import nuggets from "@/assets/nuggets.jpg";
import milkshake from "@/assets/milkshake.jpg";
import salad from "@/assets/salad.jpg";
import hotdog from "@/assets/hotdog.jpg";
import { formatIndianRupees, sanitizeAmount } from "./payments";

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  image: string;
  category: string;
  isManual?: boolean;
  sourceItemId?: string;
  originalPrice?: number;
  overriddenPrice?: number;
  isPriceOverride?: boolean;
};

export const DEFAULT_MENU: MenuItem[] = [
  { id: "m1", name: "Classic Cheeseburger", price: 199, costPrice: 85, image: burger, category: "Burgers" },
  { id: "m2", name: "Crispy Chicken Sandwich", price: 229, costPrice: 95, image: chickenSandwich, category: "Burgers" },
  { id: "m3", name: "Loaded Hot Dog", price: 149, costPrice: 60, image: hotdog, category: "Burgers" },
  { id: "m4", name: "Pepperoni Pizza Slice", price: 189, costPrice: 75, image: pizza, category: "Combos" },
  { id: "m5", name: "Golden French Fries", price: 99, costPrice: 35, image: fries, category: "Sides" },
  { id: "m6", name: "Chicken Nuggets (8pc)", price: 179, costPrice: 72, image: nuggets, category: "Sides" },
  { id: "m7", name: "Garden Fresh Salad", price: 159, costPrice: 58, image: salad, category: "Sides" },
  { id: "m8", name: "Iced Cola", price: 59, costPrice: 22, image: cola, category: "Drinks" },
  { id: "m9", name: "Chocolate Milkshake", price: 129, costPrice: 48, image: milkshake, category: "Drinks" },
];

export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 160'><rect width='200' height='160' fill='%23F4EBE0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%237A7A7A'>No image</text></svg>`,
  );

export const formatMoney = (n: number) =>
  formatIndianRupees(n);

export function getBillingPrice(item: MenuItem): number {
  const price =
    item.isPriceOverride && item.overriddenPrice !== undefined
      ? item.overriddenPrice
      : item.price;

  return sanitizeAmount(price);
}
