"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/app/context/CartContext";
import { supabase } from "@/lib/supabaseClient";

type Product = {
  id: string;
  product_name: string;
  product_sku: string;
  main_image_url: string | null;
  oem: string;
  product_type: string[] | null;
  room_size: string[] | null;
  solution_type: string[] | null;
  bundle_type: "simple" | "bundle" | "Multiproduct";
  bundle_products: string[];
  multiple_products: string[];
  stock_status: "in_stock" | "out_of_stock" | "backorder";
  stock_quantity: number;
  product_wise_ordering: string | null;
  product_category: string | null;
  menu_order: number | null;
};

import { useParams, notFound } from "next/navigation";

export default function OEMPage() {
  const { addItem } = useCart();
  const { oem } = useParams<{ oem: string }>();

  if (oem && oem.toLowerCase() !== "logitech") {
    notFound();
  }

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [roomSizes, setRoomSizes] = useState<string[]>([]);
  const [solutionTypes, setSolutionTypes] = useState<string[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);

  const [selectedProductType, setSelectedProductType] = useState<string[]>([]);
  const [selectedRoomSize, setSelectedRoomSize] = useState<string[]>([]);
  const [selectedSolutionType, setSelectedSolutionType] = useState<string[]>([]);
  const [selectedProductCategory, setSelectedProductCategory] = useState<string[]>([]);

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const getQty = (id: string) => qtyMap[id] ?? 1;

  useEffect(() => {
    if (!oem) return;

    const fetchProducts = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      fetch("/api/inventory/list", {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
      })
        .then((res) => res.json())
        .then((data: Product[]) => {
          const filtered = data.filter(
            (p) => (p.oem || "").toLowerCase() === (oem || "").toLowerCase()
          );

          setProducts(filtered);

          setProductTypes(
            Array.from(
              new Set(filtered.flatMap((p) => Array.isArray(p.product_type) ? p.product_type : p.product_type ? [p.product_type] : []))
            ).sort() as string[]
          );

          const dynamicRoomSizes = Array.from(
            new Set(filtered.flatMap((p) => Array.isArray(p.room_size) ? p.room_size : p.room_size ? [p.room_size] : []))
          ) as string[];

          const roomSizeOrder = ["Focus", "Small", "Medium", "Large"];
          const sortedRoomSizes = dynamicRoomSizes.sort((a, b) => {
            const indexA = roomSizeOrder.indexOf(a);
            const indexB = roomSizeOrder.indexOf(b);

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
          });
          setRoomSizes(sortedRoomSizes);

          setSolutionTypes(
            Array.from(
              new Set(filtered.flatMap((p) => Array.isArray(p.solution_type) ? p.solution_type : p.solution_type ? [p.solution_type] : []))
            ).sort() as string[]
          );

          const staticCategories = ["Bundle", "Video Bar (BYOD)", "Controller"];
          const dynamicCategories = Array.from(
            new Set(filtered.flatMap((p) => {
              if (p.product_category === "Appliance based video") return ["Video Bar (BYOD)"];
              return p.product_category ? [p.product_category] : [];
            }))
          );

          const combined = [...new Set([...staticCategories, ...dynamicCategories])];
          // Ensure Accessories is always last if present
          const finalCategories = [
            ...combined.filter(c => c !== "Accessories"),
            ...(combined.includes("Accessories") ? ["Accessories"] : [])
          ];
          setProductCategories(finalCategories);

          setLoading(false);
        });
    };

    fetchProducts();
  }, [oem]);

  const isProductOutOfStock = (product: Product) => {
    if (product.bundle_type === "Multiproduct") {
      return product.multiple_products?.some((compId) => {
        const comp = products.find((p) => p.id === compId);
        return comp && (comp.stock_status === "out_of_stock" || comp.stock_quantity <= 0);
      }) ?? false;
    }

    const hasOutOfStockComponent = product.bundle_type === "bundle"
      ? product.bundle_products?.some((compId) => {
        const comp = products.find((p) => p.id === compId);
        return (
          comp &&
          (comp.stock_status === "out_of_stock" || comp.stock_quantity <= 0)
        );
      })
      : false;
    return (
      product.stock_status !== "in_stock" ||
      product.stock_quantity <= 0 ||
      hasOutOfStockComponent
    );
  };

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      const pTypes = Array.isArray(p.product_type) ? p.product_type : p.product_type ? [p.product_type as unknown as string] : [];
      if (selectedProductType.length && !selectedProductType.some(t => pTypes.includes(t))) return false;

      const pRooms = Array.isArray(p.room_size) ? p.room_size : p.room_size ? [p.room_size as unknown as string] : [];
      if (selectedRoomSize.length && !selectedRoomSize.some(s => pRooms.includes(s))) return false;

      const pSols = Array.isArray(p.solution_type) ? p.solution_type : p.solution_type ? [p.solution_type as unknown as string] : [];
      if (selectedSolutionType.length && !selectedSolutionType.some(s => pSols.includes(s))) return false;

      const pCats = p.product_category ? [p.product_category === "Video Bar (BYOD)" ? "Video Bar (BYOD)" : p.product_category] : [];
      if (selectedProductCategory.length && !selectedProductCategory.some(c => pCats.includes(c))) return false;

      return true;
    });

    return [...filtered].sort((a, b) => {
      const isAOutOfStock = isProductOutOfStock(a);
      const isBOutOfStock = isProductOutOfStock(b);

      // If one is out of stock and the other isn't, the in-stock one comes first
      if (isAOutOfStock !== isBOutOfStock) {
        return isAOutOfStock ? 1 : -1;
      }

      // Both are either in stock or out of stock, sort by menu_order if set (1-10), otherwise by category rank
      const orderA = a.menu_order || 0;
      const orderB = b.menu_order || 0;

      if (orderA !== orderB) {
        if (orderA === 0) return 1;
        if (orderB === 0) return -1;
        return orderA - orderB;
      }

      const getRank = (p: Product) => {
        if (p.bundle_type?.toLowerCase() === "multiproduct") return 0;

        const val = (p.product_wise_ordering || "").trim().toLowerCase();
        if (val === "standalone bar") return 1;
        if (val === "controller") return 2;
        if (val === "sights") return 3;
        if (val === "extend") return 4;
        if (val === "swytch") return 5;
        if (val === "accessories") return 6;
        if (val === "bundle") return 7;

        return 100;
      };

      const rankA = getRank(a);
      const rankB = getRank(b);

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // If same rank, sort alphabetically
      return a.product_name.localeCompare(b.product_name);
    });
  }, [products, selectedProductType, selectedRoomSize, selectedSolutionType, selectedProductCategory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 font-medium">
        Loading products…
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1900px] mx-auto px-4 lg:px-10 py-6 lg:py-10">

        {/* Mobile Page Title & Filter Toggle */}
        <div className="flex items-center justify-between mb-6 lg:mb-10 lg:hidden px-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">All Devices</h1>
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="p-2.5 border border-gray-100 rounded-xl shadow-sm bg-white hover:bg-gray-50 transition-all duration-200 active:scale-95"
            title="Filters"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-700"
            >
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-10">

          {/* ================= FILTER SIDEBAR ================= */}
          {/* ================= DESKTOP SIDEBAR ================= */}
          <aside className="hidden lg:block w-[220px] lg:min-w-[220px] flex-shrink-0">
            <div className="sticky top-28 divide-y divide-gray-100">
              <FilterBlock
                title="Style of Deployment"
                values={productTypes}
                selected={selectedProductType}
                setSelected={setSelectedProductType}
              />

              {oem?.toLowerCase() !== "logitech" && (
                <FilterBlock
                  title="Room Size"
                  values={roomSizes}
                  selected={selectedRoomSize}
                  setSelected={setSelectedRoomSize}
                />
              )}

              {solutionTypes.length > 0 && oem?.toLowerCase() !== "logitech" && (
                <FilterBlock
                  title="Solution Type"
                  values={solutionTypes}
                  selected={selectedSolutionType}
                  setSelected={setSelectedSolutionType}
                />
              )}

              {productCategories.length > 0 && oem?.toLowerCase() !== "poly" && oem?.toLowerCase() !== "neat" && (
                <FilterBlock
                  title="Product Type"
                  values={productCategories}
                  selected={selectedProductCategory}
                  setSelected={setSelectedProductCategory}
                />
              )}
            </div>
          </aside>

          {/* ================= MOBILE FILTER DRAWER ================= */}
          <div
            className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ease-in-out ${isMobileFilterOpen ? "opacity-100 visible" : "opacity-0 invisible"
              }`}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsMobileFilterOpen(false)}
            />

            {/* Drawer Sidebar */}
            <aside
              className={`absolute inset-y-0 left-0 w-[85%] max-w-[320px] bg-white shadow-2xl transition-transform duration-300 ease-out transform ${isMobileFilterOpen ? "translate-x-0" : "-translate-x-full"
                } flex flex-col`}
            >
              {/* Drawer Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Filters</h2>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-2 -mr-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
                <FilterBlock
                  title="Style of Deployment"
                  values={productTypes}
                  selected={selectedProductType}
                  setSelected={setSelectedProductType}
                  isMobile={true}
                />

                {oem?.toLowerCase() !== "logitech" && (
                  <FilterBlock
                    title="Room Size"
                    values={roomSizes}
                    selected={selectedRoomSize}
                    setSelected={setSelectedRoomSize}
                    isMobile={true}
                  />
                )}

                {solutionTypes.length > 0 && (
                  <FilterBlock
                    title="Solution Type"
                    values={solutionTypes}
                    selected={selectedSolutionType}
                    setSelected={setSelectedSolutionType}
                    isMobile={true}
                  />
                )}

                {productCategories.length > 0 && oem?.toLowerCase() !== "poly" && oem?.toLowerCase() !== "neat" && (
                  <FilterBlock
                    title="Product Type"
                    values={productCategories}
                    selected={selectedProductCategory}
                    setSelected={setSelectedProductCategory}
                    isMobile={true}
                  />
                )}
              </div>
            </aside>
          </div>

          {/* ================= PRODUCT GRID ================= */}
          <section className="flex-1 min-w-0">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-500 font-medium italic">
                  No products found matching these filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="relative border border-gray-100 bg-white flex flex-col items-center text-center hover:shadow-xl transition-all duration-300 p-3 sm:p-5 rounded-2xl group"
                  >
                    {/* BADGE */}
                    {isProductOutOfStock(product) && (
                      <div className="absolute top-4 left-0 bg-[#EE2722] text-white text-[11px] font-semibold px-3 py-1.5 rounded-r-full z-10">
                        Out of stock
                      </div>
                    )}
                    {/* IMAGE */}
                    <div className="flex items-center justify-center mb-4 w-full" style={{ maxWidth: "293px", height: "164px", overflow: "hidden" }}>
                      <Link href={`/create-demo-kits/${product.id}`} className="block w-full h-full flex justify-center items-center">
                        <img
                          src={product.main_image_url || "/placeholder.png"}
                          alt={product.product_name}
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                        />
                      </Link>
                    </div>

                    {/* NAME */}
                    <Link
                      href={`/create-demo-kits/${product.id}`}
                      className="mb-1 duration-200 group-hover:text-blue-600 transition-colors"
                    >
                      <h3 className="text-[12px] sm:text-[13px] font-medium text-gray-800 leading-snug line-clamp-2 px-1">
                        {product.product_name}
                      </h3>
                    </Link>

                    {/* SKU */}
                    <p className="text-[11px] text-gray-400 mb-5 tracking-wide mt-1">
                      {product.product_sku}
                    </p>

                    {/* BUTTON */}
                    <div className="mt-auto w-full flex justify-center pt-2">
                      {product.bundle_type === "Multiproduct" ? (
                        <Link
                          href={`/create-demo-kits/${product.id}`}
                          className="inline-block text-[12px] font-medium py-2.5 px-8 rounded-[30px] border transition-colors border-black-300 text-black-700 bg-white hover:bg-[#76e6d1] hover:border-[#76e6d1] hover:text-black"
                        >
                          View Bundle
                        </Link>
                      ) : product.bundle_type === "bundle" ? (
                        <Link
                          href={`/create-demo-kits/${product.id}`}
                          className="inline-block text-[12px] font-medium py-2.5 px-8 rounded-[2px] border transition-colors border-gray-300 text-gray-700 bg-white hover:bg-[#C65326] hover:border-gray-400 hover:text-white"
                        >
                          View Bundle
                        </Link>
                      ) : isProductOutOfStock(product) ? (
                        <Link
                          href={`/create-demo-kits/${product.id}`}
                          className="inline-block text-[12px] font-medium py-2.5 px-8 rounded-[2px] border transition-colors border-gray-300 text-gray-700 bg-white hover:bg-[#C65326] hover:border-gray-400 hover:text-white"
                        >
                          Add to Waitlist
                        </Link>
                      ) : (
                        <button
                          onClick={() =>
                            addItem({
                              id: product.id,
                              product_id: product.id,
                              product_name: product.product_name,
                              product_sku: product.product_sku,
                              main_image_url: product.main_image_url ?? undefined,
                              quantity: getQty(product.id),
                              oem: product.oem,
                              stock_quantity: product.stock_quantity,
                            })
                          }
                          className="inline-block text-[12px] font-medium py-2.5 px-8 rounded-[2px] border transition-colors border-black-300 text-black-700 bg-white hover:bg-[#76e6d1] hover:border-[#76e6d1] hover:text-black"
                        >
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
function FilterBlock({
  title,
  values,
  selected,
  setSelected,
  isMobile = false,
}: {
  title: string;
  values: string[];
  selected: string[];
  setSelected: (v: string[]) => void;
  isMobile?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (!values.length) return null;

  if (isMobile) {
    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors border-none"
        >
          <span className="text-[14px] font-bold text-gray-900 tracking-tight text-left block">
            {title}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-[16px] w-[16px] text-gray-500 transition-transform duration-300 ${isOpen ? "rotate-0" : "rotate-180"
              }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
        {isOpen && (
          <div className="px-5 pb-5 space-y-4 bg-white">
            {values.map((v) => {
              const isChecked = selected.includes(v);
              return (
                <label
                  key={v}
                  className="flex items-center gap-3.5 cursor-pointer group select-none active:scale-[0.98] transition-transform"
                >
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="peer h-[18px] w-[18px] border-gray-300 rounded-[4px] text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                      checked={isChecked}
                      onChange={() =>
                        setSelected(
                          isChecked
                            ? selected.filter((x) => x !== v)
                            : [...selected, v]
                        )
                      }
                    />
                  </div>
                  <span
                    className={`text-[14px] leading-tight transition-colors ${isChecked
                      ? "text-gray-900 font-medium"
                      : "text-gray-600"
                      }`}
                  >
                    {title === "Room Size" ? (
                      <>
                        {v === "Focus" && "Focus (1-2 people)"}
                        {v === "Small" && "Small (3-5 people)"}
                        {v === "Medium" && "Medium (6-11 people)"}
                        {v === "Large" && "Large (11-15 people)"}
                        {!["Focus", "Small", "Medium", "Large"].includes(v) && v}
                      </>
                    ) : v}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Desktop view remains unchanged
  return (
    <div className="py-5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <span className="text-[15px] font-bold text-gray-900 tracking-tight">
          {title}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-[18px] w-[18px] text-gray-500 transition-transform duration-200 ${isOpen ? "" : "rotate-180"
            }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="space-y-3">
          {values.map((v) => {
            const isChecked = selected.includes(v);
            return (
              <label
                key={v}
                className="flex items-center gap-3 cursor-pointer group select-none"
              >
                <input
                  type="checkbox"
                  className="peer h-[15px] w-[15px] border-gray-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer accent-gray-700 flex-shrink-0"
                  checked={isChecked}
                  onChange={() =>
                    setSelected(
                      isChecked
                        ? selected.filter((x) => x !== v)
                        : [...selected, v]
                    )
                  }
                />
                <span
                  className={`text-[13px] leading-tight transition-colors ${isChecked
                    ? "text-gray-900 font-medium"
                    : "text-gray-600 group-hover:text-gray-900"
                    }`}
                >
                  {title === "Room Size" ? (
                    <>
                      {v === "Focus" && "Focus (1-2 people)"}
                      {v === "Small" && "Small (3-5 people)"}
                      {v === "Medium" && "Medium (6-11 people)"}
                      {v === "Large" && "Large (11-15 people)"}
                      {!["Focus", "Small", "Medium", "Large"].includes(v) && v}
                    </>
                  ) : v}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}