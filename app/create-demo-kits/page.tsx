"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/app/context/CartContext";
import { supabase } from "@/lib/supabaseClient";

type Product = {
  id: string;
  product_name: string;
  product_sku: string;
  main_image_url: string | null;
  oem: string;
  post_status: "published" | "private";
  stock_status: "in_stock" | "out_of_stock" | "backorder";
  bundle_type: "simple" | "bundle" | "Multiproduct";
  bundle_products: string[];
  multiple_products: string[];
  stock_quantity: number;
};

export default function CreateDemoKitsPage() {
  const { addItem, cartLimit } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      fetch("/api/inventory/list", {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
      })
        .then((res) => res.json())
        .then((data: Product[]) => {
          // SORTING LOGIC: Priority 1: In-stock Multiproduct, Priority 2: In-stock Bundle
          const sorted = [...data].sort((a, b) => {
            const getIsOutOfStock = (p: Product) => {
              // Multiproduct check
              if (p.bundle_type === "Multiproduct") {
                return p.multiple_products?.some(compId => {
                  const comp = data.find(item => item.id === compId);
                  return comp && (comp.stock_status === "out_of_stock" || comp.stock_quantity <= 0);
                }) ?? false;
              }
              // Bundle check
              const hasOutOfStockComponent = p.bundle_type === "bundle"
                ? p.bundle_products?.some(compId => {
                  const comp = data.find(item => item.id === compId);
                  return comp && (comp.stock_status === "out_of_stock" || comp.stock_quantity <= 0);
                })
                : false;
              return p.stock_status === "out_of_stock" || p.stock_quantity <= 0 || hasOutOfStockComponent;
            };

            const isAOutOfStock = getIsOutOfStock(a);
            const isBOutOfStock = getIsOutOfStock(b);

            const isAInStockMultiproduct = a.bundle_type === "Multiproduct" && !isAOutOfStock;
            const isBInStockMultiproduct = b.bundle_type === "Multiproduct" && !isBOutOfStock;

            const isAInStockBundle = a.bundle_type === "bundle" && !isAOutOfStock;
            const isBInStockBundle = b.bundle_type === "bundle" && !isBOutOfStock;

            // Multiproduct Priority
            if (isAInStockMultiproduct && !isBInStockMultiproduct) return -1;
            if (!isAInStockMultiproduct && isBInStockMultiproduct) return 1;

            // Bundle Priority (next level)
            if (isAInStockBundle && !isBInStockBundle) return -1;
            if (!isAInStockBundle && isBInStockBundle) return 1;

            return 0;
          });

          setProducts(sorted);
          setLoading(false);
        });
    };

    fetchProducts();
  }, []);

  if (loading) {
    return <div className="p-8">Loading products...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-6">
        Create Demo Kit
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => {
          // Check if bundle has any out-of-stock component
          const hasOutOfStockComponent = product.bundle_type === "bundle"
            ? product.bundle_products?.some(compId => {
              const comp = products.find(p => p.id === compId);
              return comp && (comp.stock_status === "out_of_stock" || comp.stock_quantity <= 0);
            })
            : false;

          const isMultiproduct = product.bundle_type === "Multiproduct";
          const isOutOfStock = !isMultiproduct && (product.stock_status === "out_of_stock" || product.stock_quantity <= 0 || hasOutOfStockComponent);

          return (
            <div
              key={product.id}
              className="border rounded-lg p-4 bg-white shadow-sm flex flex-col"
            >
              <Link href={`/create-demo-kits/${product.id}`}>
                <div className="cursor-pointer relative">
                  {/* BADGE */}
                  {isOutOfStock && (
                    <div className="absolute top-2 left-0 bg-[#EE2722] text-white text-[10px] font-bold px-2 py-1 rounded-r-full z-10">
                      Out of stock
                    </div>
                  )}

                  {product.main_image_url ? (
                    <img
                      src={product.main_image_url}
                      alt={product.product_name}
                      className="w-full h-40 object-contain rounded mb-3"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center rounded mb-3">
                      No Image
                    </div>
                  )}

                  <h3 className="font-medium hover:underline line-clamp-2 min-h-[3rem]">
                    {product.product_name}
                  </h3>
                </div>
              </Link>

              <p className="text-sm text-gray-500">
                SKU: {product.product_sku}
              </p>

              {!isMultiproduct && (
                <p
                  className={`text-sm mt-1 ${product.stock_status === "in_stock"
                    ? "text-green-600"
                    : "text-red-500"
                    }`}
                >
                  {product.stock_status.replace("_", " ")}
                </p>
              )}

              {product.bundle_type === "Multiproduct" ? (
                <Link
                  href={`/create-demo-kits/${product.id}`}
                  className="block mt-3 w-full px-3 py-2 rounded-[2px] text-center text-white bg-blue-600 hover:bg-blue-700 transition"
                >
                  View Multi Product
                </Link>
              ) : product.bundle_type === "bundle" ? (
                <Link
                  href={`/create-demo-kits/${product.id}`}
                  className="block mt-3 w-full px-3 py-2 rounded-[2px] text-center text-white bg-gray-600 hover:bg-gray-700 transition"
                >
                  {product.stock_status === "out_of_stock" ? "Read More" : "View Bundle"}
                </Link>
              ) : product.stock_status === "out_of_stock" ? (
                <Link
                  href={`/create-demo-kits/${product.id}`}
                  className="block mt-3 w-full px-3 py-2 rounded-[2px] text-center text-white bg-gray-600 hover:bg-gray-700 transition"
                >
                  Read More
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
                      quantity: 1,
                      oem: product.oem,
                      stock_quantity: product.stock_quantity,
                    })
                  }
                  className="mt-3 w-full px-3 py-2 rounded-[2px] text-white transition bg-blue-600 hover:bg-blue-700"
                >
                  Add to Demo Kit
                </button>
              )}

              {product.bundle_type === "bundle" && (
                <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                  Bundle
                </span>
              )}
              {product.bundle_type === "Multiproduct" && (
                <span className="inline-block mt-2 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                  Multiproduct
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
