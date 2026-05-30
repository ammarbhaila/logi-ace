"use client";

import { useCart } from "@/app/context/CartContext";
import Link from "next/link";
import { toast } from "react-hot-toast";

export default function CartSidebar() {
  const { items, removeItem, open, closeCart, addItem, cartLimit, totalQuantity } = useCart();

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={closeCart}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-75 max-w-[325px] bg-white shadow-2xl flex flex-col z-50 transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <h2 className="text-1xl font-semibold text-gray-900">Your Cart</h2>
          <button
            onClick={closeCart}
            className="text-blaxk-500 hover:text-gray-900 transition"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* CART ITEMS */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Your cart is empty</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-200">
                  {/* IMAGE */}
                  {item.main_image_url ? (
                    <img
                      src={item.main_image_url}
                      alt={item.product_name}
                      width={80}
                      height={80}
                      className="object-contain flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                      No Image
                    </div>
                  )}

                  {/* INFO */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 mb-0.5 line-clamp-2 mb-2">
                      {item.product_name}
                    </h3>

                    <p className="text-xs text-gray-500 mb-3">
                      SKU: {item.product_sku}
                    </p>

                    {/* BUNDLE ITEMS DISPLAY */}
                    {item.bundleItems && item.bundleItems.length > 0 && (
                      <div className="mb-3 pl-3 border-l-2 border-gray-100">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Bundle Includes:</p>
                        {item.bundleItems.map((bItem) => (
                          <div key={bItem.id} className="text-xs text-gray-500 flex items-start gap-1">
                            <span>•</span>
                            <span>{bItem.product_name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* QUANTITY & DELETE */}
                    <div className="flex items-center gap-3">
                      {/* Quantity Select Dropdown */}
                      <div className="relative">
                        <select
                          value={item.quantity}
                          onChange={(e) => {
                            const newQty = Number(e.target.value);
                            addItem({ ...item, quantity: newQty });
                          }}
                          className="appearance-none border border-gray-300 rounded px-2 py-0.5 text-xs bg-white pr-6 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium"
                        >
                          {Array.from({ length: Math.min(cartLimit, item.stock_quantity || cartLimit) }, (_, i) => i + 1).map((q) => (
                            <option key={q} value={q}>
                              {q}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-gray-500 transition"
                      >
                        <svg
                          className="w-4.5 h-4.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        {items.length > 0 && (
          <div className="px-6 py-4 space-y-3 bg-white">
            {/* Clear Cart */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  items.forEach((item) => removeItem(item.id));
                }}
                className="w-full text-[12px] text-gray-600 hover:text-red-600 transition flex items-center justify-end gap-1 cursor-pointer"
              >
                Clear Cart
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* View Cart */}
            <Link
              href="/cart"
              onClick={closeCart}
              className="block text-[14px] text-center bg-white border-1 border-gray-300 text-gray-900 py-3 rounded-md  hover:bg-gray-50 transition"
            >
              View Cart
            </Link>

            {/* Checkout */}
            <Link
              href="/checkout"
              onClick={closeCart}
              className="block text-[14px] text-center bg-[#C65326] hover:bg-[#b05229] text-white py-3 rounded-md  transition"
            >
              Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}