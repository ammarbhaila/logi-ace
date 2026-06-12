"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { uploadInventoryImage } from "@/lib/uploadInventoryImage";

type VariantInput = {
  color_name: string;
  color_hex: string;
  product_name: string;
  product_sku: string;
  stock_quantity: number;
  _imageFile: File | null;
  _imagePreview: string | null;
  image_url: string;
};

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

  const [variants, setVariants] = useState<VariantInput[]>([]);

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(null);

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

  // Handle banner image preview
  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setBannerImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setBannerImagePreview(null);
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

    // Upload variant images
    const finalVariants = [];
    for (const v of variants) {
      let variantImageUrl = v.image_url || "";
      if (v._imageFile) {
        variantImageUrl = await uploadInventoryImage(v._imageFile, createdProduct.id);
      }
      finalVariants.push({
        color_name: v.color_name,
        color_hex: v.color_hex,
        product_name: v.product_name || form.product_name, // fallback to base if empty
        product_sku: v.product_sku || form.product_sku,
        stock_quantity: Number(v.stock_quantity) || Number(form.stock_quantity),
        image_url: variantImageUrl,
      });
    }

    let mainImageUrl = finalVariants[0]?.image_url || null;
    let bannerImageUrl = null;
    const galleryUrls: string[] = [];

    if (!mainImageUrl && mainImage) {
      mainImageUrl = await uploadInventoryImage(mainImage, createdProduct.id);
    }

    if (bannerImage) {
      bannerImageUrl = await uploadInventoryImage(bannerImage, createdProduct.id);
    }

    for (const img of galleryImages) {
      const url = await uploadInventoryImage(img, createdProduct.id);
      galleryUrls.push(url);
    }

    // Use first variant to update base fields for backward compatibility
    const baseUpdates = finalVariants.length > 0 ? {
      product_name: finalVariants[0].product_name,
      product_sku: finalVariants[0].product_sku,
      stock_quantity: finalVariants[0].stock_quantity,
    } : {};

    await fetch("/api/inventory/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: createdProduct.id,
        main_image_url: mainImageUrl,
        banner_image_url: bannerImageUrl,
        image_urls: galleryUrls,
        variants: finalVariants.length > 0 ? finalVariants : null,
        ...baseUpdates
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

          {/* Color Variants Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <h2 className="text-lg font-semibold">Color Variants</h2>
                {variants.length > 0 && <span className="ml-2 text-xs text-gray-400">(Required — first row becomes the base product)</span>}
              </div>
              {variants.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setVariants((prev) => [
                      ...prev,
                      { color_name: "", color_hex: "#cccccc", product_name: "", product_sku: "", stock_quantity: 0, _imageFile: null, _imagePreview: null, image_url: "" },
                    ])
                  }
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition"
                >
                  + Add Another Color
                </button>
              )}
            </div>

            {variants.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600 mb-4 font-medium">Does this product come in multiple colors?</p>
                <button
                  type="button"
                  onClick={() =>
                    setVariants([
                      { 
                        color_name: "", 
                        color_hex: "#cccccc", 
                        product_name: form.product_name, 
                        product_sku: form.product_sku, 
                        stock_quantity: form.stock_quantity, 
                        _imageFile: mainImage, 
                        _imagePreview: mainImagePreview, 
                        image_url: "" 
                      },
                    ])
                  }
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md text-sm font-medium hover:bg-purple-200 transition"
                >
                  + Add Color Options
                </button>
                <p className="text-xs text-gray-400 mt-3">Leave this empty if the product only has one default color.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-4">
                  Add all color options here. The first color you add will be used as the default base product details (Name, SKU, Qty, Image).
                </p>
                <div className="space-y-4">
              {variants.map((v, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 relative bg-gray-50">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-3 right-3 text-red-400 hover:text-red-600 text-xs font-medium"
                    >
                      ✕ Remove
                    </button>
                  )}
                  {i === 0 && (
                     <span className="absolute top-3 right-3 text-purple-600 text-xs font-semibold bg-purple-100 px-2 py-0.5 rounded">
                       Base Product
                     </span>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start mt-2">
                    {/* Swatch & Name */}
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Color Name & Hex</label>
                      <input
                        type="text"
                        placeholder="e.g. White"
                        className="w-full px-2 py-1.5 mb-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-400"
                        value={v.color_name}
                        onChange={(e) =>
                          setVariants((prev) => prev.map((item, idx) => idx === i ? { ...item, color_name: e.target.value } : item))
                        }
                        required
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          className="w-8 h-8 border border-gray-300 rounded cursor-pointer p-0.5"
                          value={v.color_hex}
                          onChange={(e) =>
                            setVariants((prev) => prev.map((item, idx) => idx === i ? { ...item, color_hex: e.target.value } : item))
                          }
                        />
                        <input
                          type="text"
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs font-mono"
                          value={v.color_hex}
                          onChange={(e) =>
                            setVariants((prev) => prev.map((item, idx) => idx === i ? { ...item, color_hex: e.target.value } : item))
                          }
                        />
                      </div>
                    </div>
                    {/* Product Name */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Product Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Tap IP Touch Controller (White)"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-400"
                        value={v.product_name}
                        onChange={(e) =>
                          setVariants((prev) => prev.map((item, idx) => idx === i ? { ...item, product_name: e.target.value } : item))
                        }
                        required
                      />
                    </div>
                    {/* SKU & Qty */}
                    <div className="md:col-span-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
                        <input
                          type="text"
                          placeholder="e.g. 952-000088"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-400"
                          value={v.product_sku}
                          onChange={(e) =>
                            setVariants((prev) => prev.map((item, idx) => idx === i ? { ...item, product_sku: e.target.value } : item))
                          }
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                        <input
                          type="number"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-400"
                          value={v.stock_quantity}
                          onChange={(e) =>
                            setVariants((prev) => prev.map((item, idx) => idx === i ? { ...item, stock_quantity: Number(e.target.value) } : item))
                          }
                          min="0"
                        />
                      </div>
                    </div>
                    {/* Image */}
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Variant Image</label>
                      <label className="block cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setVariants((prev) => prev.map((item, idx) => idx === i ? { ...item, _imageFile: file, _imagePreview: reader.result as string } : item));
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                        <div className="border-2 border-dashed border-gray-300 bg-white rounded p-1 h-14 flex items-center justify-center hover:border-purple-400 transition">
                          {v._imagePreview ? (
                            <img src={v._imagePreview} alt="preview" className="h-10 object-contain" />
                          ) : (
                            <span className="text-[10px] text-gray-400 text-center">Click to upload</span>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

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

              {/* Banner Image */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-2 mt-4">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                    Banner
                  </span>
                  <span className="text-sm font-medium">Product Page Banner (Optional)</span>
                </div>
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerImageChange}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 transition cursor-pointer">
                    {bannerImagePreview ? (
                      <img src={bannerImagePreview} alt="Banner Preview" className="w-full h-32 object-cover rounded" />
                    ) : (
                      <>
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-600 mb-1">Click to upload full-width banner</p>
                        <p className="text-xs text-gray-400">Shows under Add to Cart on the product details page</p>
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
                  <option value="Logitech">Logitech</option>
                  {/* <option value="Neat">Neat</option>
                  <option value="Bose">Bose</option>
                  <option value="HP">HP</option>
                  <option value="Poly Seed">Poly Seed</option>
                  <option value="Swytch">Swytch</option>
                  <option value="Poly">Poly</option> */}
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
                  <option value="Room Add-Ons and Accessories">Room Add-Ons and Accessories</option>
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