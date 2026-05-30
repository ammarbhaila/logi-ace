"use client";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { uploadInventoryImage } from "@/lib/uploadInventoryImage";
import { toast } from "react-hot-toast";

type ProductEditSidebarProps = {
    isOpen: boolean;
    onClose: () => void;
    initialProduct: any;
    onSaveSuccess: (updatedProduct: any) => void;
};

export default function ProductEditSidebar({
    isOpen,
    onClose,
    initialProduct,
    onSaveSuccess,
}: ProductEditSidebarProps) {
    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);

    const [mainImage, setMainImage] = useState<File | null>(null);
    const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
    const [galleryImages, setGalleryImages] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

    /* ---------------- LOAD PRODUCT LIST ---------------- */
    useEffect(() => {
        if (isOpen && initialProduct) {
            setProduct({ ...initialProduct }); // Create a local copy to edit
            setMainImage(null);
            setMainImagePreview(null);
            setGalleryImages([]);
            setGalleryPreviews([]);

            // Fetch full list once to populate bundle options
            if (products.length === 0) {
                fetch("/api/inventory/list")
                    .then((res) => res.json())
                    .then((items) => {
                        setProducts(items);
                    });
            }
        }
    }, [isOpen, initialProduct]);

    if (!isOpen || !product) return null;

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

    /* ---------------- SAVE ---------------- */
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        let mainImageUrl = product.main_image_url;
        const galleryUrls = product.image_urls || [];

        try {
            if (mainImage) {
                mainImageUrl = await uploadInventoryImage(mainImage, product.id);
            }

            for (const img of galleryImages) {
                const url = await uploadInventoryImage(img, product.id);
                galleryUrls.push(url);
            }

            const submissionData = {
                ...product,
                id: product.id,
                main_image_url: mainImageUrl,
                image_urls: galleryUrls,
                product_type: (product.product_type && Array.isArray(product.product_type) && product.product_type.length > 0) ? product.product_type : null,
                room_size: (product.room_size && Array.isArray(product.room_size) && product.room_size.length > 0) ? product.room_size : null,
                solution_type: (product.solution_type && Array.isArray(product.solution_type) && product.solution_type.length > 0) ? product.solution_type : null,
                menu_order: product.menu_order || 0,
            };

            const res = await fetch("/api/inventory/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submissionData),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to update product");
            }

            // toast.success("Product updated successfully!");
            onSaveSuccess(submissionData);
            onClose();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "An error occurred during save");
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- UI ---------------- */
    return (
        <>
            <div
                className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />
            <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl z-50 transform transition-transform duration-300 translate-x-0 flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 line-clamp-1 pr-4">
                        Edit: {product.product_name}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Form Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form id="edit-product-form" onSubmit={handleSave} className="space-y-6">

                        {/* Product Images Section */}
                        <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                            <h3 className="text-md font-semibold mb-4 text-gray-800">Images</h3>

                            <div className="space-y-5">
                                {/* Primary Image */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Primary Thumbnail
                                    </label>
                                    <label className="block w-full">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleMainImageChange}
                                            className="hidden"
                                        />
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition cursor-pointer bg-white">
                                            {mainImagePreview ? (
                                                <img src={mainImagePreview} alt="Preview" className="mx-auto h-24 object-contain" />
                                            ) : product.main_image_url ? (
                                                <img src={product.main_image_url} alt="Current" className="mx-auto h-24 object-contain" />
                                            ) : (
                                                <div className="py-2">
                                                    <p className="text-sm text-gray-600">Click to upload thumbnail</p>
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                </div>

                                {/* Gallery Images */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Gallery Images
                                    </label>
                                    <label className="block w-full">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleGalleryChange}
                                            className="hidden"
                                        />
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition cursor-pointer bg-white">
                                            {galleryPreviews.length > 0 ? (
                                                <div className="grid grid-cols-4 gap-2">
                                                    {galleryPreviews.map((preview, idx) => (
                                                        <img key={idx} src={preview} alt="Gallery" className="w-full h-16 object-cover rounded" />
                                                    ))}
                                                </div>
                                            ) : product.image_urls && product.image_urls.length > 0 ? (
                                                <div className="grid grid-cols-4 gap-2">
                                                    {product.image_urls.map((url: string, idx: number) => (
                                                        <img key={idx} src={url} alt="Gallery" className="w-full h-16 object-cover rounded" />
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-2">
                                                    <p className="text-sm text-gray-600">Click to add gallery images</p>
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Core Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Product Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500"
                                    value={product.product_name}
                                    onChange={(e) =>
                                        setProduct({ ...product, product_name: e.target.value })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    SKU <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500"
                                    value={product.product_sku}
                                    onChange={(e) =>
                                        setProduct({ ...product, product_sku: e.target.value })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    OEM (Brand)
                                </label>
                                <select
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500"
                                    value={product.oem || ""}
                                    onChange={(e) =>
                                        setProduct({
                                            ...product,
                                            oem: e.target.value,
                                            bundle_products: [],
                                            multiple_products: []
                                        })
                                    }
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Device Type
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500"
                                    value={product.device_type || ""}
                                    onChange={(e) =>
                                        setProduct({ ...product, device_type: e.target.value })
                                    }
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Room Size
                                </label>
                                <select
                                    multiple
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 h-32"
                                    value={Array.isArray(product.room_size) ? product.room_size : product.room_size ? [product.room_size] : []}
                                    onChange={(e) => setProduct({ ...product, room_size: Array.from(e.target.selectedOptions, (o) => o.value) })}
                                >
                                    <option value="Focus">Focus (1-2 people)</option>
                                    <option value="Small">Small (3-5 people)</option>
                                    <option value="Medium">Medium (6-11 people)</option>
                                    <option value="Large">Large (11-15 people)</option>
                                    <option value="Medium/Large">Medium/Large</option>
                                    <option value="Small/Medium">Small/Medium</option>
                                    <option value="Huddle/Small">Huddle/Small</option>
                                </select>
                                <p className="text-[10px] text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Solution Type
                                </label>
                                <select
                                    multiple
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 h-24"
                                    value={Array.isArray(product.solution_type) ? product.solution_type : product.solution_type ? [product.solution_type] : []}
                                    onChange={(e) => setProduct({ ...product, solution_type: Array.from(e.target.selectedOptions, (o) => o.value) })}
                                >
                                    <option value="Appliance Based">Appliance Based</option>
                                    <option value="PC Based">PC Based</option>
                                    <option value="USB">USB</option>
                                </select>
                                <p className="text-[10px] text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Platform
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500"
                                    value={product.platform || ""}
                                    onChange={(e) => setProduct({ ...product, platform: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Product Type
                                </label>
                                <select
                                    multiple
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 h-32"
                                    value={Array.isArray(product.product_type) ? product.product_type : product.product_type ? [product.product_type] : []}
                                    onChange={(e) => setProduct({ ...product, product_type: Array.from(e.target.selectedOptions, (o) => o.value) })}
                                >
                                    <option value="Meeting Room Bundles">Meeting Room Bundles</option>
                                    <option value="IP Business Phones">IP Business Phones</option>
                                    <option value="Personal USB Solutions">Personal USB Solutions</option>
                                </select>
                                <p className="text-[10px] text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Product Wise Ordering
                                </label>
                                <select
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500"
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
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Menu Order
                                </label>
                                <select
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Product Type
                                </label>
                                <select
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500"
                                    value={product.product_category || ""}
                                    onChange={(e) => setProduct({ ...product, product_category: e.target.value })}
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Inventory Owner <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500"
                                    value={product.inventory_owner || ""}
                                    onChange={(e) => setProduct({ ...product, inventory_owner: e.target.value })}
                                >
                                    <option value="">Select Inventory Owner</option>
                                    <option value="Program">Program</option>
                                    <option value="Global">Global</option>
                                    <option value="Logitech Global">Logitech Global</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Bundle Type
                                </label>
                                <select
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500"
                                    value={product.bundle_type}
                                    onChange={(e) =>
                                        setProduct({
                                            ...product,
                                            bundle_type: e.target.value,
                                            bundle_products: [],
                                            multiple_products: []
                                        })
                                    }
                                >
                                    <option value="simple">Simple</option>
                                    <option value="bundle">Bundle</option>
                                    <option value="Multiproduct">Multiproduct</option>
                                </select>
                            </div>

                        </div>

                        {/* Inventory Logic */}
                        {product.bundle_type !== "Multiproduct" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Total Inventory
                                    </label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500"
                                        value={product.total_inventory}
                                        onChange={(e) => setProduct({ ...product, total_inventory: Number(e.target.value) })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Stock Quantity
                                    </label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500"
                                        value={product.stock_quantity}
                                        onChange={(e) => setProduct({ ...product, stock_quantity: Number(e.target.value) })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Stock Status
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500"
                                        value={product.stock_status}
                                        onChange={(e) => setProduct({ ...product, stock_status: e.target.value })}
                                    >
                                        <option value="in_stock">In Stock</option>
                                        <option value="out_of_stock">Out of Stock</option>
                                        <option value="backorder">Backorder</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Post Status */}
                        <div className="mt-5">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Post Status
                            </label>
                            <div className="flex gap-4 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="post_status"
                                        value="published"
                                        checked={product.post_status === "published"}
                                        onChange={(e) => setProduct({ ...product, post_status: e.target.value })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm">Publish</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="post_status"
                                        value="private"
                                        checked={product.post_status === "private"}
                                        onChange={(e) => setProduct({ ...product, post_status: e.target.value })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm">Private</span>
                                </label>
                            </div>
                        </div>

                        {/* Bundle Selector */}
                        {product.bundle_type === "bundle" && (
                            <div className="mt-5">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Bundle Products
                                </label>
                                <select
                                    multiple
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 h-32 text-sm"
                                    value={product.bundle_products || []}
                                    onChange={(e) =>
                                        setProduct({
                                            ...product,
                                            bundle_products: Array.from(e.target.selectedOptions, (o) => o.value),
                                        })
                                    }
                                >
                                    {products
                                        .filter((p) => p.id !== product.id && p.oem === product.oem)
                                        .map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.product_name} ({p.product_sku})
                                            </option>
                                        ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple. Showing only matching OEMs.</p>
                            </div>
                        )}

                        {/* Multiproduct Selector */}
                        {product.bundle_type === "Multiproduct" && (
                            <div className="mt-5">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Multiple Product <span className="text-red-500">*</span>
                                </label>
                                <select
                                    multiple
                                    required
                                    className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 h-32 text-sm"
                                    value={product.multiple_products || []}
                                    onChange={(e) =>
                                        setProduct({
                                            ...product,
                                            multiple_products: Array.from(e.target.selectedOptions, (o) => o.value),
                                        })
                                    }
                                >
                                    {products
                                        .filter((p) => p.id !== product.id && p.oem === product.oem)
                                        .map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.product_name} ({p.product_sku})
                                            </option>
                                        ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple. Showing only matching OEMs.</p>
                            </div>
                        )}

                        {/* Description */}
                        <div className="mt-5">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                rows={4}
                                className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-blue-500 text-sm"
                                value={product.description || ""}
                                onChange={(e) => setProduct({ ...product, description: e.target.value })}
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="edit-product-form"
                        disabled={loading}
                        className="px-6 py-2 text-sm font-medium text-white bg-[#213643] rounded-md hover:bg-[#1a2b35] disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </>
    );
}
