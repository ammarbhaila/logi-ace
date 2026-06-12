"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/app/context/CartContext";

type Item = {
  id: string;
  product_name: string;
  product_sku: string;
  main_image_url?: string;
  oem: string;
  stock_status?: "in_stock" | "out_of_stock" | "backorder";
  stock_quantity?: number;
  bundle_type?: "simple" | "bundle" | "Multiproduct";
  bundle_products?: string[];
  menu_order?: number;
};

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") ?? "";

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    if (!q) {
      setItems([]);
      return;
    }

    setLoading(true);
    fetch("/api/inventory/list")
      .then((r) => r.json())
      .then((data: Item[]) => {
        const allItems = data || [];
        const filtered = allItems.filter((it) => {
          const qLower = q.toLowerCase();
          const nameMatch = it.product_name?.toLowerCase().includes(qLower);
          const skuMatch = it.product_sku?.toLowerCase().includes(qLower);
          return nameMatch || skuMatch;
        });

        // Sort: Multiproduct first, then bundles, then in-stock, out-of-stock last
        const sorted = [...filtered].sort((a, b) => {
          const isOutOfStock = (item: Item) => {
            if (item.bundle_type === "Multiproduct") return false;
            const hasOOSComponent = item.bundle_type === "bundle"
              ? item.bundle_products?.some(compId => {
                const comp = allItems.find(p => p.id === compId);
                return comp && (comp.stock_status === "out_of_stock" || (comp.stock_quantity !== undefined && comp.stock_quantity <= 0));
              })
              : false;
            return item.stock_status !== "in_stock" || (item.stock_quantity !== undefined && item.stock_quantity <= 0) || hasOOSComponent;
          };

          const isAOOS = isOutOfStock(a);
          const isBOOS = isOutOfStock(b);

          const isAMulti = a.bundle_type === "Multiproduct" && !isAOOS;
          const isBMulti = b.bundle_type === "Multiproduct" && !isBOOS;

          const isABundle = a.bundle_type === "bundle" && !isAOOS;
          const isBBundle = b.bundle_type === "bundle" && !isBOOS;

          // Priority 1: In-stock Multiproduct
          if (isAMulti && !isBMulti) return -1;
          if (!isAMulti && isBMulti) return 1;

          // Priority 2: In-stock Bundle
          if (isABundle && !isBBundle) return -1;
          if (!isABundle && isBBundle) return 1;

          // Priority 3: In-stock simple items above out-of-stock
          if (!isAOOS && isBOOS) return -1;
          if (isAOOS && !isBOOS) return 1;

          // Priority 4: Menu Order (1-10, then 0)
          const orderA = a.menu_order || 0;
          const orderB = b.menu_order || 0;
          if (orderA !== orderB) {
            if (orderA === 0) return 1;
            if (orderB === 0) return -1;
            return orderA - orderB;
          }

          return 0;
        });

        setItems(sorted);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-900 mb-4 flex items-center gap-1 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">
          Search results for <span className="text-black-600">“{q}”</span>
        </h1>
        <p className="text-gray-500 font-medium mt-1">
          {items.length} {items.length === 1 ? "result" : "results"} found
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-100 rounded-xl h-[350px] animate-pulse"
            ></div>
          ))}
        </div>
      ) : q === "" ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Start searching
          </h2>
          <p className="text-gray-500 mt-2 max-w-sm">
            Enter a product name or SKU to find what you are looking for.
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            No results found
          </h2>
          <p className="text-gray-500 mt-2 max-w-sm">
            We couldn't find any products matching "<strong>{q}</strong>". Try
            different keywords or check the SKU.
          </p>
          <button
            onClick={() => {
              // clear search logic if needed, or just redirect
              router.push("/");
            }}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((it) => (
            <div
              key={it.id}
              className="relative border border-gray-200 bg-white flex flex-col items-center text-center hover:shadow-md transition-shadow duration-200 px-5 pt-6 pb-6"
              style={{ borderRadius: "8px" }}
            >
              {/* BADGE */}
              {(() => {
                const hasOutOfStockComponent = it.bundle_type === "bundle"
                  ? it.bundle_products?.some(compId => {
                    const comp = items.find(p => p.id === compId);
                    return comp && (comp.stock_status === "out_of_stock" || (comp.stock_quantity !== undefined && comp.stock_quantity <= 0));
                  })
                  : false;
                const isMultiproduct = it.bundle_type === "Multiproduct";
                const isOutOfStock = !isMultiproduct && (it.stock_status !== "in_stock" || (it.stock_quantity !== undefined && it.stock_quantity <= 0) || hasOutOfStockComponent);

                return isOutOfStock && (
                  <div className="absolute top-4 left-0 bg-[#EE2722] text-white text-[11px] font-bold px-3 py-1.5 rounded-r-full z-10">
                    Out of stock
                  </div>
                );
              })()}

              {/* IMAGE */}
              <div className="flex items-center justify-center mb-4" style={{ width: "100%", height: "164px", overflow: "hidden" }}>
                <Link href={`/create-demo-kits/${it.id}`} className="block w-full h-full">
                  <img
                    src={it.main_image_url || "/placeholder.png"}
                    alt={it.product_name}
                    style={{ width: "100%", height: "164px", objectFit: "contain" }}
                  />
                </Link>
              </div>

              {/* NAME */}
              <Link
                href={`/create-demo-kits/${it.id}`}
                className="mb-1.5 hover:text-blue-600 transition-colors"
              >
                <h3 className="text-[13px] font-medium text-gray-800 leading-snug line-clamp-2">
                  {it.product_name}
                </h3>
              </Link>

              {/* SKU */}
              <p className="text-[11px] text-gray-400 mb-5 tracking-wide mt-1">
                SKU# {it.product_sku}
              </p>

              {/* BUTTON */}
              <div className="mt-auto w-full flex justify-center">
                {it.bundle_type === "Multiproduct" ? (
                  <Link
                    href={`/create-demo-kits/${it.id}`}
                    className="inline-block text-[12px] font-medium py-2.5 px-8 rounded-full border border-gray-300 text-gray-700 bg-white hover:bg-[#76E6D1] hover:border-gray-400 hover:text-[#000000] transition-colors"
                  >
                    View Bundle
                  </Link>
                ) : it.bundle_type === "bundle" ? (
                  <Link
                    href={`/create-demo-kits/${it.id}`}
                    className="inline-block text-[12px] font-medium py-2.5 px-8 rounded-full border border-gray-300 text-gray-700 bg-white hover:bg-[#76E6D1] hover:border-gray-400 hover:text-[#000000] transition-colors"
                  >
                    View Bundle
                  </Link>
                ) : (
                  <button
                    disabled={
                      it.stock_status !== "in_stock" ||
                      (it.stock_quantity !== undefined && it.stock_quantity <= 0)
                    }
                    onClick={() =>
                      addItem({
                        id: it.id,
                        product_id: it.id,
                        product_name: it.product_name,
                        product_sku: it.product_sku,
                        main_image_url: it.main_image_url,
                        quantity: 1,
                        oem: it.oem,
                        stock_quantity: it.stock_quantity,
                      })
                    }
                    className={`inline-block text-[12px] font-medium py-2.5 px-8 rounded-full border transition-colors ${it.stock_status === "in_stock" &&
                      (it.stock_quantity !== undefined && it.stock_quantity > 0)
                      ? "border-gray-300 text-gray-700 bg-white hover:bg-[#76E6D1] hover:border-gray-400 hover:text-[#000000]"
                      : "border-gray-200 text-gray-300 cursor-not-allowed bg-white"
                      }`}
                  >
                    {it.stock_status === "in_stock"
                      ? "Add to Cart"
                      : "Out of Stock"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-12 flex justify-center">Loading search results...</div>}>
      <SearchContent />
    </Suspense>
  );
}
