"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/app/context/CartContext";
import { toast } from "react-hot-toast";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import ProductEditSidebar from "@/app/components/ProductEditSidebar";

type Product = {
  id: string;
  product_name: string;
  product_sku: string;
  description: string | null;
  main_image_url: string | null;
  image_urls: string[] | null;
  oem: string;
  stock_status: "in_stock" | "out_of_stock" | "backorder";
  bundle_type: "simple" | "bundle" | "Multiproduct";
  bundle_products: string[];
  multiple_products: string[];
  stock_quantity: number;
  total_inventory: number;
  banner_image_url: string | null;
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem, addItems } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [bundleItems, setBundleItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistCompany, setWaitlistCompany] = useState("");
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isEditSidebarOpen, setIsEditSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user?.email) {
        setWaitlistEmail(session.user.email);
      }
    };

    const getRole = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!data.error) {
          setUserRole(data.userrole);
        }
      } catch (err) {
        console.error("Failed to fetch user role", err);
      }
    };

    getSession();
    getRole();
  }, []);

  useEffect(() => {
    fetch("/api/inventory/list")
      .then((res) => res.json())
      .then((items) => {
        const found = items.find((p: Product) => p.id === id);
        if (found) {
          setProduct(found);
          setSelectedImage(found.main_image_url);
          if (found.bundle_type === "bundle" && found.bundle_products?.length) {
            const children = items.filter((p: Product) =>
              found.bundle_products.includes(p.id)
            );
            setBundleItems(children);
            // Auto-select all if it's a Multiproduct initially? 
            // The user said "select the one by one", so maybe start empty or full.
            // Let's start with all selected for convenience? No, "select one by one" suggests starting choice.
            // I'll leave it empty or provide a "Select All" button.
          } else if (found.bundle_type === "Multiproduct" && found.multiple_products?.length) {
            const children = items.filter((p: Product) =>
              found.multiple_products.includes(p.id)
            );
            setBundleItems(children);
            // Default select all in-stock items
            const inStockIds = children
              .filter((p: Product) => p.stock_status === 'in_stock' && p.stock_quantity > 0)
              .map((p: Product) => p.id);
            setSelectedItems(new Set(inStockIds));
          }
        } else {
          setProduct(null);
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-gray-500 text-sm">Loading product...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-gray-500 text-sm">Product not found</div>
      </div>
    );
  }

  // Helper variables for dynamic layout
  const bundleMaxWidthClass = product.bundle_type === "Multiproduct"
    ? (bundleItems.length === 3 ? 'max-w-[580px]' : bundleItems.length >= 4 ? 'max-w-[700px]' : 'max-w-[400px]')
    : 'max-w-[600px]';

  const bundleHeightClass = product.bundle_type === "Multiproduct" ? 'h-[220px]' : '';

  const bundleGridColsClass = bundleItems.length === 3
    ? 'md:grid-cols-3 lg:grid-cols-3'
    : bundleItems.length >= 4
      ? 'md:grid-cols-2 lg:grid-cols-4'
      : 'md:grid-cols-2 lg:grid-cols-2';

  const hasOutOfStockComponent =
    product.bundle_type === "bundle"
      ? bundleItems.some((item) => item.stock_status === "out_of_stock")
      : false;

  const isMultiproduct = product.bundle_type === "Multiproduct";

  const allComponentsOutOfStock =
    !isMultiproduct && (product.bundle_type === "bundle"
      ? bundleItems.length > 0 && bundleItems.every((item) => item.stock_status === "out_of_stock")
      : true);

  const allImages = product.image_urls ?? [];

  const canEdit = userRole === 'Admin' || userRole === 'Shop Manager' || userRole === 'Super Subscriber';

  const handleSaveSuccess = (updatedProduct: Product) => {
    // Optimistically update the local state without a full reload
    setProduct(updatedProduct);
    if (updatedProduct.main_image_url) {
      setSelectedImage(updatedProduct.main_image_url);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className={`max-w-[1400px] mx-auto px-4 md:px-6 py-8 md:py-12 ${product.bundle_type === 'simple' ? 'lg:pt-[60px] lg:pb-[40px]' : 'lg:py-[40px]'}`}>
        {isMultiproduct && (
          <p className="text-[11px] text-gray-400 font-medium mb-4 italic">
            Selected items will be added individually to your cart.
          </p>
        )}
        <div className="flex flex-col md:flex-row gap-10 lg:gap-10">

          {/* ── LEFT: Images ── */}
          <div className="flex flex-col gap-3 w-full md:w-[420px] flex-shrink-0">
            {/* Main Image */}
            <div className="relative border border-gray-100 rounded-[32px] overflow-hidden bg-white flex items-center justify-center group w-full shadow-sm"
              style={{ height: "350px" }}>

              {/* Top-Left Edit Icon (Admin Only) */}
              {canEdit && (
                <button
                  onClick={() => setIsEditSidebarOpen(true)}
                  className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm shadow-md rounded-full p-2.5 text-gray-500 hover:text-blue-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                  title="Edit Product"
                >
                  <PencilSquareIcon className="w-5 h-5" />
                </button>
              )}

              {/* BADGE */}
              {!isMultiproduct && (product.stock_status !== "in_stock" || product.stock_quantity <= 0 || hasOutOfStockComponent) && (
                <div className="absolute top-4 left-0 bg-[#EE2722] text-white text-[11px] font-bold px-3 py-1.5 rounded-r-full z-10">
                  Out of stock
                </div>
              )}
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={product.product_name}
                  className="object-contain w-full h-full p-4"
                />
              ) : (
                <div className="text-gray-300 text-sm">No Image</div>
              )}
            </div>

            {/* Thumbnails — 4 columns, same width as main image */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`aspect-square border rounded-md overflow-hidden flex items-center justify-center bg-white transition-all ${selectedImage === img
                      ? "border-orange-500 ring-1 ring-orange-400"
                      : "border-gray-200 hover:border-gray-400"
                      }`}
                  >
                    <img
                      src={img}
                      alt={`thumb-${i}`}
                      className="object-contain w-full h-full p-2"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Details ── */}
          <div className="flex-1 flex flex-col gap-4 mt-6 md:mt-0">

            {/* Product Name */}
            <h1 className="text-[22px] font-medium text-gray-900 leading-tight">
              {product.product_name}
            </h1>

            {/* SKU */}
            <p className="text-[14px] font-medium text-gray-500">
              <span className="font-medium text-gray-700"></span>{" "}
              {product.product_sku}
            </p>

            {product.description && (
              <p className="text-sm font-size-[18px] text-[#717182] leading-relaxed max-w-[700px]">
                {product.description}
              </p>
            )}

            {/* Bundle Contents or Multiproduct Contents */}
            {(product.bundle_type === "bundle" || product.bundle_type === "Multiproduct") && bundleItems.length > 0 && (
              <div className="mt-3">
                {/* Header with Title and Select All */}
                <div className={`flex items-center justify-between gap-4 mb-4 ${bundleMaxWidthClass}`}>
                  <p className="text-sm font-semibold text-gray-900">
                    {product.bundle_type === "Multiproduct" ? "This bundle includes:" : "This bundle contains:"}
                  </p>
                  {product.bundle_type === "Multiproduct" && bundleItems.length > 0 && (
                    <button
                      onClick={() => {
                        const availableItems = bundleItems.filter((i: Product) => i.stock_status === 'in_stock' && i.stock_quantity > 0);
                        if (selectedItems.size === availableItems.length) {
                          setSelectedItems(new Set());
                        } else {
                          setSelectedItems(new Set(availableItems.map((i: Product) => i.id)));
                        }
                      }}
                      className="bg-[#F2F7FF] text-[#4285F4] px-4 py-1.5 rounded-full text-xs font-medium hover:bg-[#EAF2FF] transition-colors"
                    >
                      {(() => {
                        const availableCount = bundleItems.filter((i: Product) => i.stock_status === 'in_stock' && i.stock_quantity > 0).length;
                        return selectedItems.size === availableCount ? "Deselect All" : "Select All";
                      })()}
                    </button>
                  )}
                </div>

                {product.bundle_type === "Multiproduct" ? (
                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${bundleGridColsClass} gap-4 ${bundleMaxWidthClass}`}>
                    {bundleItems.map((item) => (
                      <div
                        key={item.id}
                        className={`relative border border-gray-100 rounded-2xl p-4 bg-white shadow-sm flex flex-col items-center hover:border-gray-200 transition-all ${bundleHeightClass} ${item.stock_status !== "in_stock" || item.stock_quantity <= 0 ? "opacity-50" : ""}`}
                      >
                        {/* Checkbox for Multiproduct */}
                        <div className="absolute top-3 left-3 z-10">
                          <input
                            type="checkbox"
                            disabled={item.stock_status !== "in_stock" || item.stock_quantity <= 0}
                            checked={selectedItems.has(item.id)}
                            onChange={() => {
                              const newSelected = new Set(selectedItems);
                              if (newSelected.has(item.id)) {
                                newSelected.delete(item.id);
                              } else {
                                newSelected.add(item.id);
                              }
                              setSelectedItems(newSelected);
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>

                        {/* Out of Stock Badge */}
                        {(item.stock_status !== "in_stock" || item.stock_quantity <= 0) && (
                          <div className="absolute top-4 left-0 z-10 bg-[#FF0000] text-white px-4 py-1.5 rounded-r-full text-[12px] font-bold shadow-md">
                            Out of stock
                          </div>
                        )}

                        {/* Item Image & Info (Clickable) */}
                        <Link href={`/create-demo-kits/${item.id}`} className="w-full flex flex-col items-center flex-1">
                          <div className="w-full h-24 flex items-center justify-center mb-3 mt-2">
                            {item.main_image_url ? (
                              <img
                                src={item.main_image_url}
                                alt={item.product_name}
                                className="object-contain w-full h-full"
                              />
                            ) : (
                              <div className="bg-gray-50 w-full h-full rounded flex items-center justify-center text-gray-400 text-xs">No Image</div>
                            )}
                          </div>

                          {/* Item Info */}
                          <div className="w-full text-center mt-auto">
                            <p className="text-[13px] font-medium text-gray-900 line-clamp-2 leading-tight hover:text-blue-600 transition-colors">
                              {item.product_name}
                            </p>
                            <p className="text-[11px] text-gray-400 font-medium mt-1">
                              {item.product_sku}
                            </p>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`flex flex-col border border-gray-300 ${bundleMaxWidthClass}`}>
                    {bundleItems.map((item) => (
                      <Link
                        key={item.id}
                        href={`/create-demo-kits/${item.id}`}
                        className="flex border-b last:border-b-0 border-gray-300 bg-white items-center hover:bg-gray-50 transition-colors group"
                      >
                        {/* Item Image */}
                        <div className="w-24 h-20 flex-shrink-0 flex items-center justify-center border-r border-gray-300">
                          {item.main_image_url ? (
                            <img
                              src={item.main_image_url}
                              alt={item.product_name}
                              className="object-contain w-2/3 h-2/3"
                            />
                          ) : (
                            <div className="bg-gray-100 w-12 h-10 rounded" />
                          )}
                        </div>

                        {/* Item Info */}
                        <div className="flex-1 px-3 py-2 flex flex-col">
                          <p className="text-sm font-bold text-[#023a62] leading-tight flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                            1 x {item.product_name}
                            {(item.stock_status !== "in_stock" || item.stock_quantity <= 0) && (
                              <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border border-red-100">
                                Out of Stock
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-600 mt-2">
                            SKU : {item.product_sku}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stock Status */}
            {!isMultiproduct && (
              <p
                className={`text-sm font-semibold ${product.stock_status === "in_stock"
                  ? "text-[#023a62]"
                  : "text-red-500"
                  }`}
              >
                {product.stock_status === "in_stock"
                  ? `${product.stock_quantity} / ${product.total_inventory} In Stock`
                  : "Out of Stock"}
              </p>
            )}

            {/* Qty + Add to Cart */}
            {!isMultiproduct && product.stock_status === "in_stock" &&
              product.stock_quantity > 0 &&
              !hasOutOfStockComponent && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-1 w-full sm:w-auto">
                  {/* Qty Dropdown */}
                  <div className="relative w-full sm:w-auto">
                    <select
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      className="w-full sm:w-auto appearance-none border border-gray-300 rounded-md pl-3 pr-6 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 cursor-pointer"
                    >
                      {Array.from({ length: product.stock_quantity }, (_, i) => i + 1).map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                    {/* Chevron */}
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                      ▾
                    </span>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() =>
                      addItem({
                        id: product.id,
                        product_id: product.id,
                        product_name: product.product_name,
                        product_sku: product.product_sku,
                        main_image_url: product.main_image_url ?? undefined,
                        quantity: qty,
                        oem: product.oem,
                        stock_quantity: product.stock_quantity,
                        bundleItems:
                          product.bundle_type === "bundle"
                            ? bundleItems.map((i) => ({
                              id: i.id,
                              product_name: i.product_name,
                              product_sku: i.product_sku,
                              main_image_url: i.main_image_url ?? undefined,
                            }))
                            : undefined,
                      })
                    }
                    className="w-[full] sm:w-auto bg-[#76e6d1] hover:bg-[#65c7b5] text-black text-sm font-medium px-8 py-2.5 rounded-md transition-colors text-center"
                  >
                    Add to Cart
                  </button>
                </div>
              )}

            {isMultiproduct && bundleItems.length > 0 && (
              <div className={`mt-5 ${bundleMaxWidthClass}`}>
                <button
                  disabled={selectedItems.size === 0}
                  onClick={() => {
                    const toAdd = bundleItems
                      .filter((i) => selectedItems.has(i.id))
                      .map((item) => ({
                        id: item.id,
                        product_id: item.id,
                        product_name: item.product_name,
                        product_sku: item.product_sku,
                        main_image_url: item.main_image_url ?? undefined,
                        quantity: 1,
                        oem: item.oem,
                        stock_quantity: item.stock_quantity,
                      }));

                    if (toAdd.length > 0) {
                      addItems(toAdd);
                    }
                  }}
                  className="w-full bg-[#76e6d1] hover:bg-[#65c7b5] text-black disabled:opacity-30 text-sm font-medium py-4 rounded-xl transition-all shadow-sm text-center"
                >
                  Add to Cart
                </button>
              </div>
            )}

            {!isMultiproduct && product.stock_status === "out_of_stock" && allComponentsOutOfStock && (
              <div className="border border-gray-200 rounded-lg p-4 mt-2 bg-gray-50 w-md">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Get an alert when back in stock
                </p>
                {waitlistSuccess ? (
                  <p className="text-sm text-green-600">
                    Successfully added to waitlist! You'll be notified when it's back in stock.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <input
                      type="email"
                      placeholder="Your email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Company name (optional)"
                      value={waitlistCompany}
                      onChange={(e) => setWaitlistCompany(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <button
                      onClick={async () => {
                        if (!waitlistEmail) { alert("Please enter your email"); return; }
                        setIsSubmittingWaitlist(true);
                        try {
                          const res = await fetch("/api/waitlist", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              userid: session?.user?.id,
                              product_id: product.id,
                              email_address: waitlistEmail,
                              company_name: waitlistCompany,
                              product_name: product.product_name,
                            }),
                          });
                          if (res.ok) { setWaitlistSuccess(true); }
                          else { alert("Failed to join waitlist"); }
                        } catch (err) {
                          console.error(err);
                          alert("An error occurred");
                        } finally {
                          setIsSubmittingWaitlist(false);
                        }
                      }}
                      disabled={isSubmittingWaitlist}
                      className="w-full bg-[#C65326] hover:bg-[#b05229] text-white disabled:bg-blue-400 text-white text-sm font-medium px-6 py-2.5 rounded-md transition-colors"
                    >
                      {isSubmittingWaitlist ? "Adding..." : "Add to Waitlist"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Banner Section */}
      {product.banner_image_url && (
        <div className="w-full bg-[#F9F9F9] border-t border-b border-gray-100 py-10">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 flex justify-center">
            <img 
              src={product.banner_image_url} 
              alt="Product Banner" 
              className="max-w-full h-auto object-contain"
            />
          </div>
        </div>
      )}

      <ProductEditSidebar
        isOpen={isEditSidebarOpen}
        onClose={() => setIsEditSidebarOpen(false)}
        initialProduct={product}
        onSaveSuccess={handleSaveSuccess}
      />
    </div>
  );
}
