"use client";

interface ProductGridFiltersProps {
  categories: string[];
  category: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
  onCategoryChange: (value: string) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onSortChange: (value: string) => void;
}

export function ProductGridFilters({
  categories,
  category,
  minPrice,
  maxPrice,
  sort,
  onCategoryChange,
  onMinPriceChange,
  onMaxPriceChange,
  onSortChange,
}: ProductGridFiltersProps) {
  return (
    <div className="mb-8 grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-4">
      <select value={category} onChange={(event) => onCategoryChange(event.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
        <option value="all">All categories</option>
        {categories.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <input value={minPrice} onChange={(event) => onMinPriceChange(event.target.value)} type="number" min="0" placeholder="Min price" className="rounded-lg border bg-background px-3 py-2 text-sm" />
      <input value={maxPrice} onChange={(event) => onMaxPriceChange(event.target.value)} type="number" min="0" placeholder="Max price" className="rounded-lg border bg-background px-3 py-2 text-sm" />
      <select value={sort} onChange={(event) => onSortChange(event.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
        <option value="latest">Latest</option>
        <option value="low">Price: low to high</option>
        <option value="high">Price: high to low</option>
      </select>
    </div>
  );
}
