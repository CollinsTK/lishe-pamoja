import { useState } from "react";
import { categories } from "@/data/sampleData";
import { ListingCard } from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin } from "lucide-react";
import { useData } from "@/contexts/DataContext";

export default function RecipientHome() {
  const { listings } = useData();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);

  const filtered = listings.filter((l) => {
    if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCategory && l.category !== selectedCategory) return false;
    if (showFreeOnly && !l.isFree) return false;
    if (showDelivery && !l.deliveryAllowed) return false;
    return l.status === "Available";
  });

  return (
    <div className="space-y-4 px-4 pt-4">
      <div className="bg-gradient-hero rounded-2xl p-5 text-primary-foreground">
        <p className="text-sm opacity-90">Karibu 👋</p>
        <h2 className="font-heading font-bold text-xl mt-1">Find surplus food near you</h2>
        <p className="text-xs opacity-80 mt-1 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Nairobi, Kenya
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search listings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Badge
          variant={showFreeOnly ? "default" : "outline"}
          className="cursor-pointer whitespace-nowrap flex-shrink-0"
          onClick={() => setShowFreeOnly(!showFreeOnly)}
        >
          🆓 Free Only
        </Badge>
        <Badge
          variant={showDelivery ? "default" : "outline"}
          className="cursor-pointer whitespace-nowrap flex-shrink-0"
          onClick={() => setShowDelivery(!showDelivery)}
        >
          🚚 Delivery
        </Badge>
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap flex-shrink-0"
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-3">{filtered.length} listings available</p>
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-2">🔍</p>
            <p className="text-sm">No listings match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
