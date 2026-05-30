"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { uploadInventoryImage } from "@/lib/uploadInventoryImage";

export default function CreateInventoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    product_name: "",
    product_sku: "",
    description: "",
    stock_quantity: 0,
    total_inventory: 0,
    stock_status: "out_of_stock",
    post_status: "private",
    bundle_type: "simple",
    bundle_products: [] as string[],
    inventory_owner: "",
    product_type: [] as string[],
    room_size: [] as string[],
    solution_type: [] as string[],
    oem: "",
    device_type: "",
    platform: "",
    multiple_products: [] as string[],
    product_wise_ordering: "",
    product_category: "",
    menu_order: 0,
  });

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/inventory/list")
      .then((res) => res.json())
      .then(setProducts);
  }, []);

  // Handle main image preview
  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setMainImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMainImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setMainImagePreview(null);
    }
  };

  // Handle gallery images preview
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setGalleryImages(files);

    const previews: string[] = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        if (previews.length === files.length) {
          setGalleryPreviews([...previews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const submissionData = {
      ...form,
      inventory_owner: form.inventory_owner || null,
      product_type: (form.product_type && form.product_type.length > 0) ? form.product_type : null,
      room_size: (form.room_size && form.room_size.length > 0) ? form.room_size : null,
      solution_type: (form.solution_type && form.solution_type.length > 0) ? form.solution_type : null,
      oem: form.oem || null,
      device_type: form.device_type || null,
      platform: form.platform || null,
      product_wise_ordering: form.product_wise_ordering || null,
      product_category: form.product_category || null,
      menu_order: form.menu_order || 0,
    };

    const res = await fetch("/api/inventory/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submissionData),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Create product error:", err);
      alert(err.error || "Failed to create product");
      setLoading(false);
      return;
    }

    const createdProduct = await res.json();

    let mainImageUrl = null;
    const galleryUrls: string[] = [];

    if (mainImage) {
      mainImageUrl = await uploadInventoryImage(mainImage, createdProduct.id);
    }

    for (const img of galleryImages) {
      const url = await uploadInventoryImage(img, createdProduct.id);
      galleryUrls.push(url);
    }

    await fetch("/api/inventory/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: createdProduct.id,
        main_image_url: mainImageUrl,
        image_urls: galleryUrls,
      }),
    });

    setLoading(false);
    router.push("/inventory");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Add New Device</h1>
            <button
              onClick={() => router.push("/inventory")}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              ← Back to Inventory
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Product Images Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              <h2 className="text-lg font-semibold">Product Images</h2>
              <span className="ml-auto text-sm text-gray-500">
                Supported: PNG, JPG, WEBP
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Image */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    Primary
                  </span>
                  <span className="text-sm font-medium">Thumbnail Image</span>
                </div>
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageChange}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer">
                    {mainImagePreview ? (
                      <img src={mainImagePreview} alt="Preview" className="w-full h-40 object-cover rounded" />
                    ) : (
                      <>
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-gray-600 mb-1">Click to upload</p>
                        <p className="text-xs text-gray-400">Maximum file size: 10MB</p>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* Gallery Images */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                    Gallery
                  </span>
                  <span className="text-sm font-medium">Additional Images</span>
                </div>
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryChange}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer">
                    {galleryPreviews.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {galleryPreviews.map((preview, idx) => (
                          <img key={idx} src={preview} alt={`Gallery ${idx}`} className="w-full h-20 object-cover rounded" />
                        ))}
                      </div>
                    ) : (
                      <>
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-600">Add more images</p>
                      </>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter product name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.product_name}
                  onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                />
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter SKU"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.product_sku}
                  onChange={(e) => setForm({ ...form, product_sku: e.target.value })}
                />
              </div>

              {/* OEM (Brand) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OEM (Brand)
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.oem}
                  onChange={(e) => setForm({ ...form, oem: e.target.value, bundle_products: [], multiple_products: [] })}
                >
                  <option value="">Select OEM</option>
                  <option value="Poly">Poly</option>
                  <option value="Logitech">Logitech</option>
                  <option value="Neat">Neat</option>
                  <option value="Bose">Bose</option>
                  <option value="HP">HP</option>
                  <option value="Poly Seed">Poly Seed</option>
                  <option value="Swytch">Swytch</option>
                </select>
              </div>

              {/* Device Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device Type
                </label>
                <input
                  type="text"
                  placeholder="Enter device type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.device_type}
                  onChange={(e) => setForm({ ...form, device_type: e.target.value })}
                />
              </div>

              {/* Room Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Size
                </label>
                <select
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32"
                  value={form.room_size}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                    setForm({ ...form, room_size: selected });
                  }}
                >
                  <option value="Focus">Focus (1-2 people)</option>
                  <option value="Small">Small (3-5 people)</option>
                  <option value="Medium">Medium (6-11 people)</option>
                  <option value="Large">Large (11-15 people)</option>
                  <option value="Medium/Large">Medium/Large</option>
                  <option value="Small/Medium">Small/Medium</option>
                  <option value="Huddle/Small">Huddle/Small</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              {/* Solution Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solution Type
                </label>
                <select
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                  value={form.solution_type}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                    setForm({ ...form, solution_type: selected });
                  }}
                >
                  <option value="Appliance Based">Appliance Based</option>
                  <option value="PC Based">PC Based</option>
                  <option value="USB">USB</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform
                </label>
                <input
                  type="text"
                  placeholder="Enter platform"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                />
              </div>

              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Type
                </label>
                <select
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                  value={form.product_type}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                    setForm({ ...form, product_type: selected });
                  }}
                >
                  <option value="Meeting Room Bundles">Meeting Room Bundles</option>
                  <option value="IP Business Phones">IP Business Phones</option>
                  <option value="Personal USB Solutions">Personal USB Solutions</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              {/* Product Wise Ordering */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Wise Ordering
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.product_wise_ordering}
                  onChange={(e) => setForm({ ...form, product_wise_ordering: e.target.value })}
                >
                  <option value="">Select Ordering Type</option>
                  <option value="Bundle">Bundle</option>
                  <option value="Standalone bar">Standalone bar</option>
                  <option value="Controller">Controller</option>
                  <option value="Sights">Sights</option>
                  <option value="Extend">Extend</option>
                  <option value="Swytch">Swytch</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>

              {/* Menu Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Menu Order
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.menu_order}
                  onChange={(e) => setForm({ ...form, menu_order: parseInt(e.target.value) })}
                >
                  {[...Array(11).keys()].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.product_category}
                  onChange={(e) =>
                    setForm({ ...form, product_category: e.target.value })
                  }
                >
                  <option value="">Select Product Type</option>
                  <option value="Bundle">Bundle</option>
                  <option value="Video Bar (BYOD)">Video Bar (BYOD)</option>
                  <option value="Controller">Controller</option>
                  <option value="Sights">Sights</option>
                  <option value="Extend">Extend</option>
                  <option value="Swytch">Swytch</option>
                  <option value="Accessories">Accessories</option>

                </select>
              </div>

              {/* Inventory Owner */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inventory Owner <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.inventory_owner}
                  onChange={(e) => setForm({ ...form, inventory_owner: e.target.value })}
                >
                  <option value="">Select Inventory Owner</option>
                  <option value="Program">Program</option>
                  <option value="Global">Global</option>
                  <option value="Logitech Global">Logitech Global</option>
                </select>
              </div>

              {/* Bundle Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bundle Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.bundle_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bundle_type: e.target.value,
                      bundle_products: [],
                    })
                  }
                >
                  <option value="simple">Simple</option>
                  <option value="bundle">Bundle</option>
                  <option value="Multiproduct">Multiproduct</option>
                </select>
              </div>

              {/* Total Inventory, Stock Quantity, Stock Status - Hidden for Multiproduct */}
              {form.bundle_type !== "Multiproduct" && (
                <>
                  {/* Total Inventory */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Inventory
                    </label>
                    <input
                      type="number"
                      placeholder="Enter total inventory"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.total_inventory}
                      onChange={(e) =>
                        setForm({ ...form, total_inventory: Number(e.target.value) })
                      }
                    />
                  </div>

                  {/* Stock Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      placeholder="Enter stock quantity"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.stock_quantity}
                      onChange={(e) =>
                        setForm({ ...form, stock_quantity: Number(e.target.value) })
                      }
                    />
                  </div>

                  {/* Stock Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Status
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={form.stock_status}
                      onChange={(e) => setForm({ ...form, stock_status: e.target.value })}
                    >
                      <option value="in_stock">In Stock</option>
                      <option value="out_of_stock">Out of Stock</option>
                      <option value="backorder">Backorder</option>
                    </select>
                  </div>
                </>
              )}

              {/* Post Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Post Status
                </label>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="post_status"
                      value="published"
                      checked={form.post_status === "published"}
                      onChange={(e) => setForm({ ...form, post_status: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Publish</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="post_status"
                      value="private"
                      checked={form.post_status === "private"}
                      onChange={(e) => setForm({ ...form, post_status: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Private</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Bundle Products - Full Width */}
            {form.bundle_type === "bundle" && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bundle Products
                </label>
                <select
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent h-48"
                  value={form.bundle_products}
                  onChange={(e) => {
                    const selected = Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    );
                    setForm({ ...form, bundle_products: selected });
                  }}
                >
                  {products
                    .filter((p: any) => !form.oem || p.oem === form.oem)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_name} ({p.product_sku})
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Hold Ctrl (Windows) or Cmd (Mac) to select multiple products
                </p>
              </div>
            )}

            {/* Multiple Products - Full Width (Conditional) */}
            {form.bundle_type === "Multiproduct" && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Multiple Product <span className="text-red-500">*</span>
                </label>
                <select
                  multiple
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent h-48"
                  value={form.multiple_products}
                  onChange={(e) => {
                    const selected = Array.from(
                      e.target.selectedOptions,
                      (option) => option.value
                    );
                    setForm({ ...form, multiple_products: selected });
                  }}
                >
                  {products
                    .filter((p: any) => !form.oem || p.oem === form.oem)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_name} ({p.product_sku})
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Hold Ctrl (Windows) or Cmd (Mac) to select multiple products. Required for Multiproduct type.
                </p>
              </div>
            )}

            {/* Description - Full Width */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                placeholder="Enter device description"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Add details like condition, highlights, notes.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/inventory")}
              className="px-6 py-2.5 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}