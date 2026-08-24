export type BookingStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid"
  | "in_progress"
  | "returned";

export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  is_blocked: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

export interface Item {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  size: string;
  price_per_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItemImage {
  id: string;
  item_id: string;
  url: string;
  sort_order: number;
}

export interface Booking {
  id: string;
  item_id: string;
  renter_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  status: BookingStatus;
  total_price: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface Rating {
  id: string;
  booking_id: string;
  rater_id: string;
  ratee_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}

export const ITEM_CATEGORIES = [
  "Dresses",
  "Suits & Formalwear",
  "Outerwear",
  "Accessories",
  "Shoes",
  "Other",
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const ITEM_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type ItemSize = (typeof ITEM_SIZES)[number];
