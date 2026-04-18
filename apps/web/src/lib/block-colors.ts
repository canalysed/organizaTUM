import type { BlockType } from "@organizaTUM/shared";

export const BLOCK_COLORS: Record<
  BlockType,
  { bg: string; text: string; border: string; dot: string }
> = {
  lecture:    { bg: "bg-tum-blue",        text: "text-white",        border: "border-tum-blue",        dot: "bg-tum-blue" },
  uebung:     { bg: "bg-tum-blue-light",  text: "text-white",        border: "border-tum-blue-light",  dot: "bg-tum-blue-light" },
  study:      { bg: "bg-tum-green/20",    text: "text-green-800",    border: "border-tum-green",       dot: "bg-tum-green" },
  meal:       { bg: "bg-tum-orange/20",   text: "text-orange-800",   border: "border-tum-orange",      dot: "bg-tum-orange" },
  break:      { bg: "bg-tum-ivory",       text: "text-gray-600",     border: "border-gray-300",        dot: "bg-tum-ivory" },
  leisure:    { bg: "bg-purple-100",      text: "text-purple-800",   border: "border-purple-300",      dot: "bg-purple-400" },
  exercise:   { bg: "bg-tum-green/30",    text: "text-green-900",    border: "border-tum-green",       dot: "bg-tum-green" },
  commitment: { bg: "bg-tum-gray/20",     text: "text-gray-700",     border: "border-tum-gray",        dot: "bg-tum-gray" },
};
