
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function EditInventoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(null);

  /* ---------------- LOAD PRODUCT + PRODUCT LIST ---------------- */
  useEffect(() => {
    if (!id) return;

    fetch("/api/inventory/list")
      .then((res) => res.json())
      .then((items) => {
        setProducts(items);
        const p = items.find((p: any) => p.id === id);
        setProduct(p);
      });
  }, [id]);

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

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

  /* ---------------- SAVE ---------------- */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let mainImageUrl = product.main_image_url;
    let bannerImageUrl = product.banner_image_url;
    const galleryUrls = product.image_urls || [];

    if (mainImage) {
      mainImageUrl = await uploadInventoryImage(mainImage, product.id);
    }

    if (bannerImage) {
      bannerImageUrl = await uploadInventoryImage(bannerImage, product.id);
    }

    for (const img of galleryImages) {
      const url = await uploadInventoryImage(img, product.id);
      galleryUrls.push(url);
    }

    const submissionData = {
      ...product,
      id: product.id,
      main_image_url: mainImageUrl,
      banner_image_url: bannerImageUrl,
      image_urls: galleryUrls,
      color_name: product.color_name || null,
      color_hex: product.color_hex || null,
      inventory_owner: product.inventory_owner || null,
      product_type: (product.product_type && Array.isArray(product.product_type) && product.product_type.length > 0) ? product.product_type : null,
      room_size: (product.room_size && Array.isArray(product.room_size) && product.room_size.length > 0) ? product.room_size : null,
      solution_type: (product.solution_type && Array.isArray(product.solution_type) && product.solution_type.length > 0) ? product.solution_type : null,
      oem: product.oem || null,
      device_type: product.device_type || null,
      platform: product.platform || null,
      product_wise_ordering: product.product_wise_ordering || null,
      product_category: product.product_category || null,
      menu_order: product.menu_order || 0,
    };

    const res = await fetch("/api/inventory/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submissionData),
    });

    setLoading(false);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Update error:", errData);
      alert(`Failed to update product: ${errData.error || "Unknown error"}`);
      return;
    }

    router.push("/inventory");
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Edit Device</h1>
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
        <form onSubmit={handleSave} className="space-y-6">

          {/* Product Color */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Color Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Name</label>
                <input
                  type="text"
                  placeholder="e.g. White"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  value={product.color_name || ""}
                  onChange={(e) => setProduct({ ...product, color_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Hex</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="w-10 h-10 border border-gray-300 rounded cursor-pointer p-0.5"
                    value={product.color_hex || "#cccccc"}
                    onChange={(e) => setProduct({ ...product, color_hex: e.target.value })}
                  />
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono"
                    value={product.color_hex || "#cccccc"}
                    onChange={(e) => setProduct({ ...product, color_hex: e.target.value })}
                  />
                </div>
              </div>
            </div>
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
                    ) : product.main_image_url ? (
                      <img src={product.main_image_url} alt="Current" className="w-full h-40 object-cover rounded" />
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
                    ) : product.image_urls && product.image_urls.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {product.image_urls.map((url: string, idx: number) => (
                          <img key={idx} src={url} alt={`Gallery ${idx}`} className="w-full h-20 object-cover rounded" />
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
                    ) : product.banner_image_url ? (
                      <img src={product.banner_image_url} alt="Current Banner" className="w-full h-32 object-cover rounded" />
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
                  value={product.product_name}
                  onChange={(e) =>
                    setProduct({ ...product, product_name: e.target.value })
                  }
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
                  value={product.product_sku}
                  onChange={(e) =>
                    setProduct({ ...product, product_sku: e.target.value })
                  }
                />
              </div>

              {/* OEM (Brand) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OEM (Brand)
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={product.oem || ""}
                  onChange={(e) =>
                    setProduct({ ...product, oem: e.target.value })
                  }
                >
                  <option value="">Select OEM</option>
                  <option value="Logitech">Logitech</option>
                  {/* <option value="Poly">Poly</option>
                  <option value="Neat">Neat</option>
                  <option value="Bose">Bose</option>
                  <option value="HP">HP</option>
                  <option value="Poly Seed">Poly Seed</option>
                  <option value="Swytch">Swytch</option> */}
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
                  value={product.device_type || ""}
                  onChange={(e) =>
                    setProduct({ ...product, device_type: e.target.value })
                  }
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
                  value={Array.isArray(product.room_size) ? product.room_size : product.room_size ? [product.room_size] : []}
                  onChange={(e) =>
                    setProduct({ ...product, room_size: Array.from(e.target.selectedOptions, (o) => o.value) })
                  }
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
                  value={Array.isArray(product.solution_type) ? product.solution_type : product.solution_type ? [product.solution_type] : []}
                  onChange={(e) =>
                    setProduct({ ...product, solution_type: Array.from(e.target.selectedOptions, (o) => o.value) })
                  }
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
                  value={product.platform || ""}
                  onChange={(e) =>
                    setProduct({ ...product, platform: e.target.value })
                  }
                />
              </div>

              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Type
                </label>
                <select
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32"
                  value={Array.isArray(product.product_type) ? product.product_type : product.product_type ? [product.product_type] : []}
                  onChange={(e) =>
                    setProduct({ ...product, product_type: Array.from(e.target.selectedOptions, (o) => o.value) })
                  }
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
                  value={product.product_wise_ordering || ""}
                  onChange={(e) => setProduct({ ...product, product_wise_ordering: e.target.value })}
                >
                  <option value="">Select Ordering Type</option>
                  <option value="Bundle">Bundle</option>
                  <option value="Standalone bar">Standalone bar</option>
                  <option value="Controller">Controller</option>
                  <option value="Sights">Sights</option>
                  <option value="Extend">Extend</option>
                  <option value="Swytch">Swytch</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Room Add-Ons and Accessories">Room Add-Ons and Accessories</option>` 11`
                </select>
              </div>

              {/* Menu Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Menu Order
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={product.menu_order || 0}
                  onChange={(e) => setProduct({ ...product, menu_order: parseInt(e.target.value) })}
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
                  value={product.product_category || ""}
                  onChange={(e) =>
                    setProduct({ ...product, product_category: e.target.value })
                  }
                >
                  <option value="">Select Product Type</option>
                  <option value="Controller">Controller</option>
                  <option value="Video Bar (BYOD)">Video Bar (BYOD)</option>
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
                  value={product.inventory_owner || ""}
                  onChange={(e) =>
                    setProduct({ ...product, inventory_owner: e.target.value })
                  }
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
                  value={product.bundle_type}
                  onChange={(e) =>
                    setProduct({
                      ...product,
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
              {product.bundle_type !== "Multiproduct" && (
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
                      value={product.total_inventory}
                      onChange={(e) =>
                        setProduct({
                          ...product,
                          total_inventory: Number(e.target.value),
                        })
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
                      value={product.stock_quantity}
                      onChange={(e) =>
                        setProduct({
                          ...product,
                          stock_quantity: Number(e.target.value),
                        })
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
                      value={product.stock_status}
                      onChange={(e) =>
                        setProduct({ ...product, stock_status: e.target.value })
                      }
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
                      checked={product.post_status === "published"}
                      onChange={(e) =>
                        setProduct({ ...product, post_status: e.target.value })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Publish</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="post_status"
                      value="private"
                      checked={product.post_status === "private"}
                      onChange={(e) =>
                        setProduct({ ...product, post_status: e.target.value })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Private</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Bundle Products - Full Width */}
            {product.bundle_type === "bundle" && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bundle Products
                </label>
                <select
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent h-48"
                  value={product.bundle_products || []}
                  onChange={(e) =>
                    setProduct({
                      ...product,
                      bundle_products: Array.from(
                        e.target.selectedOptions,
                        (o) => o.value
                      ),
                    })
                  }
                >
                  {products
                    .filter((p) => p.id !== product.id)
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
            {product.bundle_type === "Multiproduct" && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Multiple Product <span className="text-red-500">*</span>
                </label>
                <select
                  multiple
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent h-48"
                  value={product.multiple_products || []}
                  onChange={(e) =>
                    setProduct({
                      ...product,
                      multiple_products: Array.from(
                        e.target.selectedOptions,
                        (o) => o.value
                      ),
                    })
                  }
                >
                  {products
                    .filter((p) => p.id !== product.id)
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
                value={product.description || ""}
                onChange={(e) =>
                  setProduct({ ...product, description: e.target.value })
                }
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
              className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 text-[14px] hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#213643] text-white rounded-md text-[14px] hover:bg-[#1a2b35] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

