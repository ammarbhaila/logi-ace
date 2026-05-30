"use client";

import Link from "next/link";
import { useCart } from "@/app/context/CartContext";

export default function CartPage() {
  const { items, removeItem, addItem, cartLimit } = useCart();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleQtyChange = (item: typeof items[0], newQty: number) => {
    if (newQty < 1) return;
    addItem({ ...item, quantity: newQty });
  };

  return (
    <div className="min-h-screen bg-white px-4 md:px-8 py-6 md:py-8">
      {/* Note */}
      <p className="text-xs text-gray-400 mb-6 mt-1 italic">
        *Maximum one bundle or 2 units per order
      </p>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 lg:items-start">

        {/* ===== LEFT: CART ITEMS (single white card) ===== */}
        <div className="flex-1">
          {items.length === 0 && (
            <div className="border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm shadow-sm">
              Your cart is empty.
            </div>
          )}

          {items.length > 0 && (
            <div className="border border-gray-200 rounded-xl shadow-sm bg-white">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row items-start gap-6 sm:gap-8 px-4 sm:px-8 py-8 sm:py-10 ${index < items.length - 1 ? "border-b border-gray-200" : ""
                    }`}
                >
                  {/* Product Image */}
                  <div className="flex-shrink-0 w-full sm:w-32 h-40 sm:h-24 flex items-center justify-center">
                    {item.main_image_url ? (
                      <img
                        src={item.main_image_url}
                        alt={item.product_name}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400 rounded">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 w-full text-center sm:text-left">
                    <h3 className="text-base font-medium text-gray-900 leading-snug mb-2 sm:mb-3">
                      {item.product_name}
                    </h3>
                    <p className="text-sm font-poppins mb-2 sm:mb-3">
                      <span className="text-[#000000]">SKU:</span>{" "}
                      <span className="text-[#626262]">{item.product_sku}</span>
                    </p>

                    {/* BUNDLE ITEMS DISPLAY */}
                    {item.bundleItems && item.bundleItems.length > 0 && (
                      <div className="mb-4 pl-3 border-l-2 border-gray-100 py-1 text-left">
                        <p className="text-[12px] font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">Bundle Includes:</p>
                        <div className="space-y-1.5">
                          {item.bundleItems.map((bItem) => (
                            <div key={bItem.id} className="text-[13px] text-gray-500 flex items-start gap-2">
                              <span className="text-gray-300 select-none">•</span>
                              <span className="leading-tight">{bItem.product_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quantity Select + Remove */}
                    <div className="flex items-center justify-center sm:justify-start gap-4">
                      {/* Quantity Select Input */}
                      <div className="relative">
                        <select
                          value={item.quantity}
                          onChange={(e) => handleQtyChange(item, Number(e.target.value))}
                          className="appearance-none border border-gray-300 rounded-md px-3 py-1 text-xs bg-white pr-6 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
                        >
                          {Array.from({ length: Math.min(cartLimit, item.stock_quantity || cartLimit) }, (_, i) => i + 1).map((q) => (
                            <option key={q} value={q}>
                              {q}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="relative right-2 flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition font-medium"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
                        </svg>

                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== RIGHT: CART SUMMARY ===== */}
        <div className="w-full lg:w-[370px] flex-shrink-0">
          <div className="sticky top-24">
            {/* Summary card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md mb-5">
              <h2 className="text-2xl font-poppins text-gray-900 text-center mb-6">
                Cart Summary
              </h2>

              <div className="space-y-3">
                <SummaryRow label="Number of Item(s)" value={`${totalItems}`} />
                <SummaryRow label="Ships Within" value="48 hours of Approval" />
                <SummaryRow label="Shipment Type" value="Overnight" />
                <SummaryRow label="Demo Period" value="Up to 30 Days" />
              </div>
            </div>

            {/* Checkout button outside card */}
            <Link
              href={items.length === 0 ? "#" : "/checkout"}
              className={`flex items-center justify-center w-full lg:max-w-[360px] mx-auto lg:ml-2 h-[55px] rounded-[5px] font-poppins text-lg transition ${items.length === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none"
                : "bg-[#c65d2f] hover:bg-[#b05229] text-white shadow-sm"
                }`}
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      </div>

      {/* Recommended Section */}
      <RecommendedSection />
    </div>
  );
}

/* ===== RECOMMENDED PRODUCTS ===== */
const RECOMMENDED_PRODUCTS = [
  {
    id: "cedc40ce-33d4-5837-b28d-93693bbc922a",
    product_id: "cedc40ce-33d4-5837-b28d-93693bbc922a",
    product_name: "Logitech Sight Graphite",
    product_sku: "960-001510",
    main_image_url: "https://shiuchub.com/wp-content/uploads/2024/02/logi-sight.jpg",
    oem: "Logitech",
  },
  {
    id: "6511c3d5-2a76-5349-8700-cd04c0b71bea",
    product_id: "6511c3d5-2a76-5349-8700-cd04c0b71bea",
    product_name: "Logitech Sight White",
    product_sku: "960-001503",
    main_image_url: "https://shiuchub.com/wp-content/uploads/2024/02/960001503.jpg",
    oem: "Logitech",
  }
];

function RecommendedSection() {
  const { addItem, items } = useCart();

  // Show recommended products only if there's a Logitech product in the cart
  const hasLogitech = items.some(item => item.oem?.toLowerCase() === 'logitech');

  if (!hasLogitech) return null;

  return (
    <div className="mt-15 mb-12">
      <div className="flex flex-col mb-5">
        <h2 className="text-2xl font-medium text-gray-900 mb-2">Recommended Products</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {RECOMMENDED_PRODUCTS.map((product) => {
          // Check if same OEM is in cart
          const cartIsOemMatch = items.length === 0 || items[0].oem?.toLowerCase() === product.oem.toLowerCase();

          return (
            <div
              key={product.id}
              className="relative border border-gray-100 bg-white flex flex-col items-center text-center hover:shadow-xl transition-all duration-300 p-3 sm:p-5 rounded-2xl group"
            >
              {/* IMAGE */}
              <div className="flex items-center justify-center mb-4 w-full" style={{ maxWidth: "293px", height: "164px", overflow: "hidden" }}>
                <Link href={`/create-demo-kits/${product.id}`} className="block w-full h-full flex justify-center items-center">
                  <img
                    src={product.main_image_url}
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
                SKU# {product.product_sku}
              </p>

              {/* BUTTON */}
              <div className="mt-auto w-full flex justify-center pt-2">
                <button
                  onClick={() => addItem({ ...product, quantity: 1 })}
                  className="inline-block text-[12px] font-medium py-2.5 px-8 rounded-[2px] border transition-colors border-gray-300 text-gray-700 bg-white hover:bg-[#C65326] hover:border-gray-400 hover:text-white"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== SUMMARY ROW ===== */
function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded-lg relative gap-2">
      <span className="text-sm text-gray-800 px-2 sm:px-4 flex items-center flex-1 leading-tight">
        {label}
      </span>
      <div className="w-px bg-gray-300 my-2 self-stretch" />
      <span className="text-sm text-gray-800 px-2 sm:px-4 flex items-center justify-end whitespace-nowrap min-w-[100px] sm:min-w-[130px]">
        {value}
      </span>
    </div>
  );
}
