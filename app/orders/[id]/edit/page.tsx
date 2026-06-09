"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { uploadOrderDocument } from '@/lib/uploadOrderDocument';
import { toast } from 'react-hot-toast';

export default function OrderEditPage() {
    const { id } = useParams();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [inventory, setInventory] = useState<any[]>([]);
    const [showProductModal, setShowProductModal] = useState(false);
    const [orderItems, setOrderItems] = useState<any[]>([]);
    const [originalOrderItems, setOriginalOrderItems] = useState<any[]>([]);
    const [sendEmailNotification, setSendEmailNotification] = useState(true);
    const [returnedProductIds, setReturnedProductIds] = useState<string[]>([]);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const router = useRouter();

    const STATUS_OPTIONS = [
        { label: 'Processing', value: 'Processing', color: '#ff8c00' },
        { label: 'Shipped', value: 'Shipped', color: '#00c853' },
        { label: 'Returned', value: 'Returned', color: '#ff5252' },
        { label: 'Rejected', value: 'Rejected', color: '#d32f2f' },
        { label: 'Extension Approve', value: 'Extension Approve', color: '#2979ff' },
    ];

    const filteredStatusOptions = useMemo(() => {
        if (userRole === 'Admin') return STATUS_OPTIONS;

        if (userRole === 'Shop Manager') {
            const currentStatus = order?.order_status;
            if (currentStatus === 'Awaiting Approval') {
                return [{ label: 'Awaiting Approval', value: 'Awaiting Approval', color: '#9ca3af' }];
            }
            // For approved statuses, allow Processing, Shipped, Returned
            return STATUS_OPTIONS.filter(opt => ['Processing', 'Shipped', 'Returned'].includes(opt.value));
        }

        return STATUS_OPTIONS;
    }, [userRole, order?.order_status, STATUS_OPTIONS]);

    const [formData, setFormData] = useState<any>({
        order_status: '',
        tracking_id: '',
        tracking_link: '',
        return_tracking_id: '',
        return_tracking_link: '',
        notes: '',
        sales_executive: '',
        sales_executive_email: '',
        account_opportunity_owner: '',
        sales_manager_email: '',
        customer_company_name: '',
        customer_contact_name: '',
        customer_contact_email: '',
        customer_shipping_address: '',
        city: '',
        state: '',
        zip: '',
        return_label_url: '',
        // Common Opportunity Details
        device_opportunity_size_units: '',
        revenue_opportunity_size: '',
        sps_account_number: '',
        segment: '',
        estimated_closed_date: '',
        competitive_vendor: '',
        // OEM Specific / Additional
        approved_deal_reg: '',
        reg_number: '',
        platform: '',
        desired_demo_delivery_date: '',
        evaluating_other_solutions: '',
        project_budget_determined: '',
        staged_roll_out: '',
        estimated_budget_amount: '',
        technical_support: '',
        logitech_engaged: '',
        engaged_ae_name: '',
        virtual_support: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) {
                    router.push('/login');
                    return;
                }

                const profileRes = await fetch("/api/auth/me");
                const profileData = await profileRes.json();

                let role = null;
                if (profileData.error) {
                    const { data: profile } = await supabase
                        .from('profile')
                        .select('userrole')
                        .or(`id.eq.${user.id},userId.eq.${user.id}`)
                        .single();
                    role = profile?.userrole || null;
                } else {
                    role = profileData.userrole || null;
                }

                setUserRole(role);
                setUserEmail(user.email || null);

                if (role !== 'Admin' && role !== 'Shop Manager') {
                    router.push('/orders/my');
                    return;
                }

                const res = await fetch(`/api/orders/${id}`);
                const data = await res.json();
                if (data.error) {
                    toast.error(data.error);
                } else {
                    setOrder(data);
                    const items = data.items || [];
                    setOrderItems(items);
                    setOriginalOrderItems(JSON.parse(JSON.stringify(items))); // Deep copy for comparison
                    setFormData({
                        order_status: data.order_status || '',
                        tracking_id: data.tracking_id || '',
                        tracking_link: data.tracking_link || '',
                        return_tracking_id: data.return_tracking_id || '',
                        return_tracking_link: data.return_tracking_link || '',
                        notes: data.notes || '',
                        sales_executive: data.sales_executive || '',
                        sales_executive_email: data.sales_executive_email || '',
                        account_opportunity_owner: data.account_opportunity_owner || '',
                        sales_manager_email: data.sales_manager_email || '',
                        customer_company_name: data.customer_company_name || '',
                        customer_contact_name: data.customer_contact_name || '',
                        customer_contact_email: data.customer_contact_email || '',
                        customer_shipping_address: data.customer_shipping_address || '',
                        city: data.city || '',
                        state: data.state || '',
                        zip: data.zip || '',
                        return_label_url: data.return_label_url || '',
                        // Common Opportunity Details
                        device_opportunity_size_units: data.device_opportunity_size_units || '',
                        revenue_opportunity_size: data.revenue_opportunity_size || '',
                        sps_account_number: data.sps_account_number || '',
                        segment: data.segment || '',
                        estimated_closed_date: data.estimated_closed_date ? new Date(data.estimated_closed_date).toISOString().split('T')[0] : '',
                        competitive_vendor: data.competitive_vendor || '',
                        // OEM Specific / Additional
                        approved_deal_reg: data.approved_deal_reg || '',
                        reg_number: data.reg_number || '',
                        platform: data.platform || '',
                        desired_demo_delivery_date: data.desired_demo_delivery_date || '',
                        evaluating_other_solutions: data.evaluating_other_solutions || '',
                        project_budget_determined: data.project_budget_determined || '',
                        staged_roll_out: data.staged_roll_out || '',
                        estimated_budget_amount: data.estimated_budget_amount || '',
                        technical_support: data.technical_support || '',
                        logitech_engaged: data.logitech_engaged || '',
                        engaged_ae_name: data.engaged_ae_name || '',
                        virtual_support: data.virtual_support || '',
                    });

                    if (Array.isArray(data.items)) {
                        setReturnedProductIds(data.items.map((i: any) => i.product_id));
                    }
                    const invRes = await fetch('/api/inventory/list');
                    const invData = await invRes.json();
                    if (Array.isArray(invData)) setInventory(invData);
                }
                setLoading(false);
            } catch (err) {
                console.error('Failed to fetch order details:', err);
                setLoading(false);
            }
        };

        fetchData();
    }, [id, router]);

    const manufacturers = useMemo(() => new Set(orderItems.map(item => item.product?.manufacturer?.toLowerCase() || item.product?.oem?.toLowerCase())), [orderItems]);
    const hasPoly = manufacturers.has('poly');
    const hasLogitech = manufacturers.has('logitech') || manufacturers.has('logi');
    const hasNeat = manufacturers.has('neat');

    const canEditAll = userRole === 'Admin';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await uploadOrderDocument(file, id as string);
            setFormData((prev: any) => ({ ...prev, return_label_url: url }));
            // toast.success('File uploaded successfully!');
        } catch (err: any) {
            toast.error('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const syncStock = async (productId: string, delta: number) => {
        try {
            const invRes = await fetch(`/api/inventory/list`);
            const invData = await invRes.json();
            const product = invData.find((p: any) => p.id === productId);

            if (product) {
                // 1. Update main product stock
                const currentStock = product.stock_quantity || 0;
                const newStock = Math.max(0, currentStock - delta);

                await fetch('/api/inventory/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: productId,
                        stock_quantity: newStock
                    }),
                });
                console.log(`[DEBUG] Stock synced for product ${productId}: ${currentStock} -> ${newStock}`);

                // 2. If it's a bundle, sync components stock too
                if (product.bundle_type === 'bundle' && product.bundle_products && product.bundle_products.length > 0) {
                    console.log(`[DEBUG] Product ${productId} is a bundle. Syncing ${product.bundle_products.length} components.`);

                    for (const componentId of product.bundle_products) {
                        const component = invData.find((p: any) => p.id === componentId);
                        if (component) {
                            const compCurrentStock = component.stock_quantity || 0;
                            const compNewStock = Math.max(0, compCurrentStock - delta);

                            await fetch('/api/inventory/update', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    id: componentId,
                                    stock_quantity: compNewStock
                                }),
                            });
                            console.log(`[DEBUG] Component stock synced for ${componentId}: ${compCurrentStock} -> ${compNewStock}`);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[DEBUG] Failed to sync stock:', err);
            toast.error('Failed to sync stock with inventory');
        }
    };

    const getAvailableStock = (productId: string, currentQty: number) => {
        const invItem = inventory.find(i => i.id === productId);
        if (!invItem) return 0;

        const originalItem = originalOrderItems.find(i => i.product_id === productId);
        const originalQty = originalItem ? originalItem.quantity : 0;

        // Current stock in DB already accounts for originalQty.
        // available = current_db_stock - (current_order_qty - original_order_qty)
        const dbStock = invItem.stock_quantity || 0;
        const delta = currentQty - originalQty;
        let available = dbStock - delta;

        // If it's a bundle, also check components
        if (invItem.bundle_type === 'bundle' && invItem.bundle_products && invItem.bundle_products.length > 0) {
            const componentAvailabilities = invItem.bundle_products.map((compId: string) => {
                const component = inventory.find(p => p.id === compId);
                if (!component) return 0;
                return (component.stock_quantity || 0) - delta;
            });
            available = Math.min(available, ...componentAvailabilities);
        }

        return Math.max(0, available);
    };

    const handleQuantityChange = async (productId: string, delta: number) => {
        const item = orderItems.find(i => i.product_id === productId);
        if (!item) return;

        if (delta > 0) {
            const available = getAvailableStock(productId, item.quantity);
            if (available <= 0) {
                toast.error('Cannot increase quantity further. Out of stock.');
                return;
            }
        }

        setOrderItems(prev => prev.map(i => {
            if (i.product_id === productId) {
                const newQty = Math.max(1, i.quantity + delta);
                return { ...i, quantity: newQty };
            }
            return i;
        }));
    };

    const handleAddItem = (product: any) => {
        // RULE: Order must be from a single OEM
        const newOem = (product.oem || product.manufacturer)?.trim().toLowerCase();

        if (orderItems.length > 0 && newOem) {
            const existingProduct = orderItems[0].product;
            const existingOem = (existingProduct?.oem || existingProduct?.manufacturer)?.trim().toLowerCase();

            if (existingOem && existingOem !== newOem) {
                toast.error(
                    `You can only add products from the same manufacturer. This order already contains ${existingProduct?.oem || existingProduct?.manufacturer} products.`,
                    { duration: 5000 }
                );
                return;
            }
        }

        const existing = orderItems.find(i => i.product_id === product.id);
        if (existing) {
            handleQuantityChange(product.id, 1);
        } else {
            const newItem = {
                product_id: product.id,
                quantity: 1,
                product: {
                    product_name: product.product_name,
                    product_sku: product.product_sku,
                    manufacturer: product.manufacturer || product.oem,
                    oem: product.oem || product.manufacturer,
                    processor: product.processor,
                    memory: product.memory,
                    bundle_type: product.bundle_type,
                    bundle_products: product.bundle_products
                }
            };
            setOrderItems(prev => [...prev, newItem]);
            setReturnedProductIds(prev => [...prev, product.id]);
        }
        setShowProductModal(false);
        toast.success(`Added ${product.product_name}`);
    };

    const handleRemoveItem = async (productId: string) => {
        setOrderItems(prev => prev.filter(i => i.product_id !== productId));
    };

    const commitInventoryChanges = async () => {
        console.log('[DEBUG] Committing inventory changes vs original state...');

        // 1. Identify all unique product IDs across both states
        const allProductIds = Array.from(new Set([
            ...originalOrderItems.map(i => i.product_id),
            ...orderItems.map(i => i.product_id)
        ]));

        for (const productId of allProductIds) {
            const original = originalOrderItems.find(i => i.product_id === productId);
            const current = orderItems.find(i => i.product_id === productId);

            const originalQty = original ? original.quantity : 0;
            const currentQty = current ? current.quantity : 0;

            const delta = currentQty - originalQty;

            if (delta !== 0) {
                console.log(`[DEBUG] Syncing delta for ${productId}: ${delta}`);
                await syncStock(productId, delta);
            }
        }

        // After syncing, the current state becomes the new baseline
        setOriginalOrderItems(JSON.parse(JSON.stringify(orderItems)));
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsStatusDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isProductOutOfStock = (product: any) => {
        // Simple product check
        if (!product.bundle_type || product.bundle_type !== 'bundle') {
            return (product.stock_quantity || 0) <= 0;
        }
        // Bundle check: Bundle itself OR any component out of stock
        if ((product.stock_quantity || 0) <= 0) return true;

        if (product.bundle_products && product.bundle_products.length > 0) {
            return product.bundle_products.some((compId: string) => {
                const component = inventory.find(p => p.id === compId);
                return !component || (component.stock_quantity || 0) <= 0;
            });
        }
        return false;
    };

    const toggleReturnedProduct = (productId: string) => {
        setReturnedProductIds(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const handleSelectStatus = (statusValue: string) => {
        setFormData((prev: any) => ({ ...prev, order_status: statusValue }));
        if (statusValue === 'Extension Approve') {
            setSendEmailNotification(false);
        }
        setIsStatusDropdownOpen(false);
    };

    const handleStatusUpdate = async () => {
        // Use native browser validation when status is Shipped
        if (formData.order_status === 'Shipped' && formRef.current && !formRef.current.reportValidity()) {
            return;
        }
        setSaving(true);
        try {
            // Update order status and tracking fields
            const updatePayload = {
                order_status: formData.order_status,
                tracking_id: formData.tracking_id,
                tracking_link: formData.tracking_link,
                return_tracking_id: formData.return_tracking_id,
                return_tracking_link: formData.return_tracking_link,
                return_label_url: formData.return_label_url,
                notes: formData.notes,
                updated_by: userEmail,
                items: orderItems.map(i => ({
                    product_id: i.product_id,
                    quantity: i.quantity
                })),
                returned_items: returnedProductIds
            };

            const res = await fetch(`/api/orders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            if (res.ok) {
                // COMMIT INVENTORY CHANGES ONLY if order is NOT transitioning to a terminal status
                // (Backend handles restoration for Returned/Rejected/Cancelled to avoid double-counting)
                const INACTIVE_STATUSES = ['Returned', 'Rejected', 'Cancelled'];
                if (!INACTIVE_STATUSES.includes(formData.order_status)) {
                    await commitInventoryChanges();
                }

                if (sendEmailNotification) {
                    // Send emails based on status
                    const fullRes = await fetch(`/api/orders/${id}`);
                    const fullData = await fullRes.json();

                    if (formData.order_status === 'Shipped') {
                        await fetch('/api/email/send-shipped-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                orderId: id,
                                orderData: { ...fullData, shipping_performed_by: userEmail },
                                cartItems: fullData.items || [],
                            }),
                        });
                    } else if (formData.order_status === 'Returned') {
                        // Partial Return Logic: Pass original quantity and returned quantity
                        const itemsForReturnedEmail = (fullData.items || []).map((item: any) => ({
                            ...item,
                            original_quantity: item.quantity,
                            quantity: returnedProductIds.includes(item.product_id) ? item.quantity : 0
                        }));

                        await fetch('/api/email/send-returned-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                orderId: id,
                                orderData: { ...fullData, return_performed_by: userEmail },
                                cartItems: itemsForReturnedEmail,
                            }),
                        });
                    } else if (formData.order_status === 'Processing' || formData.order_status === 'Rejected') {
                        await fetch('/api/email/approve-reject', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                orderId: id,
                                status: formData.order_status,
                                orderData: fullData,
                                cartItems: fullData.items || [],
                            }),
                        });
                    } else if (formData.order_status === 'Awaiting Approval') {
                        // Resend the "New Order" / Order Confirmation email to act as the update
                        await fetch('/api/email/order-confirmation', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                orderId: id,
                                userEmail: userEmail,
                                formData: {
                                    salesExecutive: fullData.sales_executive,
                                    salesExecutiveEmail: fullData.sales_executive_email,
                                    accountOpportunityOwner: fullData.account_opportunity_owner,
                                    salesManagerEmail: fullData.sales_manager_email,
                                    customerCompanyName: fullData.customer_company_name,
                                    customerContactName: fullData.customer_contact_name,
                                    customerContactEmail: fullData.customer_contact_email,
                                    customerShippingAddress: fullData.customer_shipping_address,
                                    city: fullData.city,
                                    state: fullData.state,
                                    zip: fullData.zip,
                                    deviceOpportunitySizeUnits: fullData.device_opportunity_size_units,
                                    revenueOpportunitySize: fullData.revenue_opportunity_size,
                                    stagedRollOut: fullData.staged_roll_out,
                                    estimatedBudgetAmount: fullData.estimated_budget_amount,
                                    logitechEngaged: fullData.logitech_engaged,
                                    engagedAENAME: fullData.engaged_ae_name,
                                    technicalSupport: fullData.technical_support,
                                    virtualSupport: fullData.virtual_support,
                                    approvedDealReg: fullData.approved_deal_reg,
                                    evaluatingOtherSolutions: fullData.evaluating_other_solutions,
                                    projectBudgetDetermined: fullData.project_budget_determined,
                                    desiredDemoDeliveryDate: fullData.desired_demo_delivery_date,
                                    regNumber: fullData.reg_number,
                                    platform: fullData.platform,
                                    competitiveVendor: fullData.competitive_vendor,
                                    spsAccountNumber: fullData.sps_account_number,
                                    segment: fullData.segment,
                                    estimatedClosedDate: fullData.estimated_closed_date,
                                    notes: fullData.notes,
                                },
                                cartItems: fullData.items || [],
                            }),
                        });
                    }
                    // toast.success('Status updated and notification sent!');
                } else {
                    // toast.success('Status updated successfully (Email notification skipped)');
                }
                router.refresh();
            } else {
                toast.error('Failed to update status');
            }
        } catch (err) {
            toast.error('Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setSaving(true);

        const updatePayload = {
            ...formData,
            updated_by: userEmail,
            items: orderItems.map(i => ({
                product_id: i.product_id,
                quantity: i.quantity
            }))
        };

        try {
            const res = await fetch(`/api/orders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            if (res.ok) {
                // COMMIT INVENTORY CHANGES (CALCULATE DELTAS VS BASELINE)
                await commitInventoryChanges();

                // If sendEmailNotification is checked, handle email sending for the updated status
                if (sendEmailNotification) {
                    try {
                        const fullRes = await fetch(`/api/orders/${id}`);
                        const fullData = await fullRes.json();

                        if (formData.order_status === 'Shipped') {
                            const emailOrderData = {
                                ...fullData,
                                tracking_id: formData.tracking_id || fullData.tracking_id,
                                tracking_link: formData.tracking_link || fullData.tracking_link,
                                return_tracking_id: formData.return_tracking_id || fullData.return_tracking_id,
                                return_tracking_link: formData.return_tracking_link || fullData.return_tracking_link,
                                return_label_url: formData.return_label_url || fullData.return_label_url,
                                shipping_performed_by: userEmail,
                            };

                            await fetch('/api/email/send-shipped-email', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    orderId: id,
                                    orderData: emailOrderData,
                                    cartItems: fullData.items || [],
                                }),
                            });
                            console.log(`[DEBUG] Shipped email sent for order #${id}`);
                        } else if (formData.order_status === 'Returned') {
                            const itemsForReturnedEmail = (fullData.items || []).map((item: any) => ({
                                ...item,
                                quantity: returnedProductIds.includes(item.product_id) ? item.quantity : 0
                            }));

                            const returnedEmailData = {
                                ...fullData,
                                return_performed_by: userEmail,
                            };

                            await fetch('/api/email/send-returned-email', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    orderId: id,
                                    orderData: returnedEmailData,
                                    cartItems: itemsForReturnedEmail,
                                }),
                            });
                            console.log(`[DEBUG] Returned email sent for order #${id}`);
                        } else if (formData.order_status === 'Processing' || formData.order_status === 'Rejected') {
                            await fetch('/api/email/approve-reject', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    orderId: id,
                                    status: formData.order_status,
                                    orderData: fullData,
                                    cartItems: fullData.items || [],
                                }),
                            });
                            console.log(`[DEBUG] ${formData.order_status} email sent for order #${id}`);
                        } else if (formData.order_status === 'Awaiting Approval') {
                            // Resend the "New Order" / Order Confirmation email to act as the update
                            await fetch('/api/email/order-confirmation', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    orderId: id,
                                    userEmail: userEmail,
                                    formData: {
                                        salesExecutive: fullData.sales_executive,
                                        salesExecutiveEmail: fullData.sales_executive_email,
                                        accountOpportunityOwner: fullData.account_opportunity_owner,
                                        salesManagerEmail: fullData.sales_manager_email,
                                        customerCompanyName: fullData.customer_company_name,
                                        customerContactName: fullData.customer_contact_name,
                                        customerContactEmail: fullData.customer_contact_email,
                                        customerShippingAddress: fullData.customer_shipping_address,
                                        city: fullData.city,
                                        state: fullData.state,
                                        zip: fullData.zip,
                                        deviceOpportunitySizeUnits: fullData.device_opportunity_size_units,
                                        revenueOpportunitySize: fullData.revenue_opportunity_size,
                                        stagedRollOut: fullData.staged_roll_out,
                                        estimatedBudgetAmount: fullData.estimated_budget_amount,
                                        logitechEngaged: fullData.logitech_engaged,
                                        engagedAENAME: fullData.engaged_ae_name,
                                        technicalSupport: fullData.technical_support,
                                        virtualSupport: fullData.virtual_support,
                                        approvedDealReg: fullData.approved_deal_reg,
                                        evaluatingOtherSolutions: fullData.evaluating_other_solutions,
                                        projectBudgetDetermined: fullData.project_budget_determined,
                                        desiredDemoDeliveryDate: fullData.desired_demo_delivery_date,
                                        regNumber: fullData.reg_number,
                                        platform: fullData.platform,
                                        competitiveVendor: fullData.competitive_vendor,
                                        spsAccountNumber: fullData.sps_account_number,
                                        segment: fullData.segment,
                                        estimatedClosedDate: fullData.estimated_closed_date,
                                        notes: fullData.notes,
                                    },
                                    cartItems: fullData.items || [],
                                }),
                            });
                            console.log(`[DEBUG] Awaiting Approval (Update) email sent for order #${id}`);
                        }
                    } catch (emailErr) {
                        console.error('[DEBUG] Failed to send email:', emailErr);
                    }
                }

                // toast.success('Order updated successfully!');
                router.push(`/orders/${id}`);
            } else {
                toast.error('Failed to update order');
            }
        } catch (err) {
            toast.error('Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a]"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 bg-white min-h-screen font-sans">
            <div className="flex justify-between items-center mb-4">
                <Link href={`/orders/${id}`} className="flex items-center text-sm text-gray-500 hover:text-gray-800 group w-fit">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Order
                </Link>
            </div>
            <div className="flex justify-between items-center mb-8">
                {/* <h1 className="text-2xl font-semibold text-gray-800">Update Order #{String(id).padStart(4, '0')}</h1> */}
                <h1 className="text-2xl font-semibold text-gray-800">Update Order #{order?.id || id}</h1>
                <div className="flex items-center gap-3 relative" ref={dropdownRef}>
                    {/* CUSTOM DROPDOWN TRIGGER */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                            className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-gray-300 transition-all min-w-[180px]"
                        >
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: (filteredStatusOptions.find(opt => opt.value === formData.order_status) || STATUS_OPTIONS.find(opt => opt.value === formData.order_status))?.color || '#9ca3af' }}
                            ></div>
                            <span className="text-sm font-semibold text-gray-700 flex-1 text-left">
                                {formData.order_status || 'Select Status'}
                            </span>
                            <svg
                                className={`w-4 h-4 text-gray-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* DROPDOWN MENU */}
                        {isStatusDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                                <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                                    <h4 className="text-sm font-bold text-gray-900">Update Order Status</h4>
                                </div>
                                <div className="p-2">
                                    {filteredStatusOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => handleSelectStatus(option.value)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-blue-50/50 rounded-xl transition-colors group"
                                        >
                                            <div
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: option.color }}
                                            ></div>
                                            <span className={`text-sm flex-1 text-left ${formData.order_status === option.value ? 'font-bold text-blue-600' : 'text-gray-600 font-medium'}`}>
                                                {option.label}
                                            </span>
                                            {formData.order_status === option.value && (
                                                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                <div className="p-4 border-t border-gray-50 mt-1">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={sendEmailNotification}
                                                onChange={(e) => setSendEmailNotification(e.target.checked)}
                                                className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 checked:bg-[#9c27b0] checked:border-[#9c27b0] transition-all"
                                            />
                                            <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none hidden peer-checked:block ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-700">Send email notification</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleStatusUpdate}
                        disabled={saving}
                        className={`px-8 py-2 rounded-lg font-semibold text-sm shadow-sm transition-all transform active:scale-95 ${saving
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#e5e7eb] hover:bg-[#d1d5db] text-[#374151]'
                            }`}
                    >
                        {saving ? 'Updating...' : 'Update'}
                    </button>
                </div>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
                {/* ORDER ITEMS SECTION */}
                <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-semibold text-[#1e3a8a] flex items-center">
                            <span className="mr-2"></span> Order Items ({orderItems.length})
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowProductModal(true)}
                            className="text-xs font-semibold text-blue-600 bg-white border border-blue-100 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            + Add Item
                        </button>
                    </div>
                    <div className="p-4 space-y-4">
                        {orderItems.map((item: any) => (
                            <div key={item.product_id} className="border border-gray-100 p-4 rounded-xl space-y-4">
                                <div className="flex justify-between items-center group relative overflow-hidden">
                                    <div className="flex gap-4 items-center">
                                        {/* <div className="bg-blue-50 text-blue-600 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                                            {item.product?.manufacturer?.charAt(0) || 'P'}
                                        </div> */}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-blue-900 leading-tight">{item.product?.product_name}</h4>
                                                {/* Partial Return Checkbox */}
                                                {formData.order_status === 'Returned' && (
                                                    <input
                                                        type="checkbox"
                                                        checked={returnedProductIds.includes(item.product_id)}
                                                        onChange={() => toggleReturnedProduct(item.product_id)}
                                                        className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 ml-2 cursor-pointer"
                                                        title="Include in return stock restoration"
                                                    />
                                                )}
                                            </div>
                                            <div className="flex gap-3 mt-1">
                                                <p className="text-[10px] font-semibold text-gray-400">SKU: {item.product?.product_sku}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="relative">
                                                <select
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const newVal = parseInt(e.target.value);
                                                        handleQuantityChange(item.product_id, newVal - item.quantity);
                                                    }}
                                                    className="w-full sm:w-auto appearance-none border border-gray-300 rounded-md pl-3 pr-6 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 cursor-pointer"
                                                >
                                                    {(() => {
                                                        const invItem = inventory.find(i => i.id === item.product_id);
                                                        const originalItem = originalOrderItems.find(i => i.product_id === item.product_id);
                                                        const originalQty = originalItem ? originalItem.quantity : 0;
                                                        const dbStock = invItem ? invItem.stock_quantity : 0;
                                                        const totalAvailable = dbStock + originalQty;

                                                        return Array.from({ length: Math.max(item.quantity, totalAvailable) }, (_, i) => i + 1).map(num => (
                                                            <option key={num} value={num}>
                                                                {num}
                                                            </option>
                                                        ));
                                                    })()}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(item.product_id)}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Bundle Components Display */}
                                    {item.product?.bundle_type === 'bundle' && item.product?.bundle_products?.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-50 pl-14 space-y-2">
                                            <p className="text-[10px] font-extrabold text-gray-400 uppercase mb-2">Bundle Components</p>
                                            {item.product.bundle_products.map((componentId: string) => {
                                                const component = inventory.find(p => p.id === componentId);
                                                return component ? (
                                                    <div key={componentId} className="flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-200"></div>
                                                        <div className="flex gap-4">
                                                            <span className="text-xs font-bold text-gray-600">{component.product_name}</span>
                                                            <span className="text-[10px] font-mono text-gray-400 uppercase">SKU: {component.product_sku}</span>
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* TRACKING INFORMATION */}
                <section className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase bg-gray-50 p-2 pl-4 rounded">Tracking Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500">Tracking Number {formData.order_status === 'Shipped' && <span className="text-red-500">*</span>}</label>
                            <input
                                name="tracking_id"
                                value={formData.tracking_id}
                                onChange={handleInputChange}
                                className={`w-full p-2.5 border rounded-lg text-sm ${formData.order_status === 'Shipped' && !formData.tracking_id?.trim() ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                                placeholder="Enter tracking number"
                                required={formData.order_status === 'Shipped'}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500">Tracking Link {formData.order_status === 'Shipped' && <span className="text-red-500">*</span>}</label>
                            <input
                                name="tracking_link"
                                value={formData.tracking_link}
                                onChange={handleInputChange}
                                className={`w-full p-2.5 border rounded-lg text-sm ${formData.order_status === 'Shipped' && !formData.tracking_link?.trim() ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                                placeholder="https://..."
                                required={formData.order_status === 'Shipped'}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500">Return Tracking Number {formData.order_status === 'Shipped' && <span className="text-red-500">*</span>}</label>
                            <input
                                name="return_tracking_id"
                                value={formData.return_tracking_id}
                                onChange={handleInputChange}
                                className={`w-full p-2.5 border rounded-lg text-sm ${formData.order_status === 'Shipped' && !formData.return_tracking_id?.trim() ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                                placeholder="Enter return tracking number"
                                required={formData.order_status === 'Shipped'}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500">Return Tracking Link {formData.order_status === 'Shipped' && <span className="text-red-500">*</span>}</label>
                            <input
                                name="return_tracking_link"
                                value={formData.return_tracking_link}
                                onChange={handleInputChange}
                                className={`w-full p-2.5 border rounded-lg text-sm ${formData.order_status === 'Shipped' && !formData.return_tracking_link?.trim() ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}
                                placeholder="https://..."
                                required={formData.order_status === 'Shipped'}
                            />
                        </div>
                    </div>


                    <div className="space-y-1 mt-4">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-tight">Return Label {formData.order_status === 'Shipped' && <span className="text-red-500">*</span>}</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="file"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors cursor-pointer border border-dashed border-gray-200 p-2 rounded-xl"
                            />
                            {uploading && <div className="text-xs text-blue-600 font-bold animate-pulse">Uploading...</div>}
                            {formData.return_label_url && !uploading && (
                                <div className="flex items-center gap-3">
                                    <div className="text-xs text-green-600 font-bold flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Uploaded
                                    </div>
                                    <a
                                        href={formData.return_label_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        View File
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* TEAM DETAILS */}
                {canEditAll && (
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase bg-gray-50 p-2 pl-4 rounded">Team Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Sales Executive *</label>
                                <input
                                    name="sales_executive"
                                    value={formData.sales_executive}
                                    onChange={handleInputChange}
                                    readOnly={!canEditAll}
                                    className={`w-full p-2.5 border border-gray-200 rounded-lg text-sm ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Sales Executive Email *</label>
                                <input
                                    name="sales_executive_email"
                                    value={formData.sales_executive_email}
                                    onChange={handleInputChange}
                                    readOnly={!canEditAll}
                                    className={`w-full p-2.5 border border-gray-200 rounded-lg text-sm ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Sales Manager *</label>
                                <input
                                    name="sales_manager"
                                    value={formData.sales_manager}
                                    onChange={handleInputChange}
                                    readOnly={!canEditAll}
                                    className={`w-full p-2.5 border border-gray-200 rounded-lg text-sm ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Sales Manager Email *</label>
                                <input
                                    name="sales_manager_email"
                                    value={formData.sales_manager_email}
                                    onChange={handleInputChange}
                                    readOnly={!canEditAll}
                                    className={`w-full p-2.5 border border-gray-200 rounded-lg text-sm ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                />
                            </div>
                        </div>
                    </section>
                )}


                {/* SHIPPING DETAILS */}
                {canEditAll && (
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase bg-gray-50 p-2 pl-4 rounded">Shipping Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Company Name</label>
                                <input
                                    name="customer_company_name"
                                    value={formData.customer_company_name}
                                    onChange={handleInputChange}
                                    readOnly={!canEditAll}
                                    className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Contact Name</label>
                                <input
                                    name="customer_contact_name"
                                    value={formData.customer_contact_name}
                                    onChange={handleInputChange}
                                    readOnly={!canEditAll}
                                    className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Contact Email</label>
                                <input
                                    name="customer_contact_email"
                                    value={formData.customer_contact_email}
                                    onChange={handleInputChange}
                                    readOnly={!canEditAll}
                                    className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Shipping Address</label>
                                <input
                                    name="customer_shipping_address"
                                    value={formData.customer_shipping_address}
                                    onChange={handleInputChange}
                                    readOnly={!canEditAll}
                                    className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">City</label>
                                <input
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    readOnly={!canEditAll}
                                    className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">State</label>
                                <input
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                    readOnly={!canEditAll}
                                    className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">ZIP Code</label>
                                <input
                                    name="zip"
                                    value={formData.zip}
                                    onChange={handleInputChange}
                                    readOnly={!canEditAll}
                                    className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                />
                            </div>
                        </div>
                    </section>
                )}

                {/* OPPORTUNITY DETAILS TABLE */}
                {canEditAll && (
                    <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b border-gray-100">
                            <h3 className="font-bold text-[#1e3a8a] text-sm uppercase tracking-wider">Opportunity Details</h3>
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-gray-100">
                                    <tr>
                                        <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Opportunity size (Number of rooms)</td>
                                        <td className="p-4 font-medium w-1/4">
                                            <input
                                                type="number"
                                                name="device_opportunity_size_units"
                                                value={formData.device_opportunity_size_units}
                                                onChange={handleInputChange}
                                                readOnly={!canEditAll}
                                                className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                            />
                                        </td>
                                        <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Revenue Opportunity Size ($ Device Rev)</td>
                                        <td className="p-4 font-medium w-1/4">
                                            <input
                                                type="number"
                                                name="revenue_opportunity_size"
                                                value={formData.revenue_opportunity_size}
                                                onChange={handleInputChange}
                                                readOnly={!canEditAll}
                                                className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">SPS Account #</td>
                                        <td className="p-4 font-medium">
                                            <input
                                                name="sps_account_number"
                                                value={formData.sps_account_number}
                                                onChange={handleInputChange}
                                                readOnly={!canEditAll}
                                                className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                            />
                                        </td>
                                        <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Segment</td>
                                        <td className="p-4 font-medium">
                                            <select
                                                name="segment"
                                                value={formData.segment}
                                                onChange={handleInputChange}
                                                disabled={!canEditAll}
                                                className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                            >
                                                <option value="">Select Segment</option>
                                                <option value="Global">Global</option>
                                                <option value="Strategic/Stratascale">Strategic/Stratascale</option>
                                                <option value="Enterprise">Enterprise</option>
                                                <option value="Commercial">Commercial</option>
                                                <option value="Public Sector Field">Public Sector Field</option>
                                                <option value="Federal">Federal</option>
                                                <option value="Public Sector Inside">Public Sector Inside</option>
                                                <option value="Federal/Healthcare">Federal/Healthcare</option>
                                            </select>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Estimated Closed Date</td>
                                        <td className="p-4 font-medium">
                                            <input
                                                type="date"
                                                name="estimated_closed_date"
                                                value={formData.estimated_closed_date}
                                                onChange={handleInputChange}
                                                readOnly={!canEditAll}
                                                className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                            />
                                        </td>
                                        <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">If yes, provide competitive vendor</td>
                                        <td className="p-4 font-medium">
                                            <input
                                                type="text"
                                                name="competitive_vendor"
                                                value={formData.competitive_vendor}
                                                onChange={handleInputChange}
                                                readOnly={!canEditAll}
                                                className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                                placeholder="Competitor name"
                                            />
                                        </td>
                                    </tr>
                                    {/* POLY FIELDS */}
                                    {hasPoly && (
                                        <>
                                            <tr>
                                                <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Is your customer evaluating any other collaboration solutions?</td>
                                                <td className="p-4 font-medium">
                                                    <select name="evaluating_other_solutions" value={formData.evaluating_other_solutions} onChange={handleInputChange} disabled={!canEditAll} className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}>
                                                        <option value="">Select</option>
                                                        <option value="Yes">Yes</option>
                                                        <option value="No">No</option>
                                                    </select>
                                                </td>
                                                <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Has the customer determined a project budget?</td>
                                                <td className="p-4 font-medium">
                                                    <select name="project_budget_determined" value={formData.project_budget_determined} onChange={handleInputChange} disabled={!canEditAll} className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}>
                                                        <option value="">Select</option>
                                                        <option value="Yes">Yes</option>
                                                        <option value="No">No</option>
                                                    </select>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Platform</td>
                                                <td className="p-4 font-medium text-xs">
                                                    <input name="platform" value={formData.platform} onChange={handleInputChange} readOnly={!canEditAll} className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`} placeholder="e.g. Zoom, Teams" />
                                                </td>
                                                <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Approved Deal Reg</td>
                                                <td className="p-4 font-medium text-xs">
                                                    <select name="approved_deal_reg" value={formData.approved_deal_reg} onChange={handleInputChange} disabled={!canEditAll} className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}>
                                                        <option value="">Select</option>
                                                        <option value="Yes">Yes</option>
                                                        <option value="No">No</option>
                                                    </select>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Desired Demo Delivery Date</td>
                                                <td className="p-4 font-medium">
                                                    <input type="date" name="desired_demo_delivery_date" value={formData.desired_demo_delivery_date} onChange={handleInputChange} readOnly={!canEditAll} className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`} />
                                                </td>
                                                <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Reg #</td>
                                                <td className="p-4 font-medium text-xs">
                                                    <input name="reg_number" value={formData.reg_number} onChange={handleInputChange} readOnly={!canEditAll} className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`} placeholder="Reg #" />
                                                </td>
                                            </tr>
                                        </>
                                    )}

                                    {/* LOGITECH SPECIFIC */}
                                    {hasLogitech && (
                                        <>
                                            <tr>
                                                <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Has a Logitech AE been engaged?</td>
                                                <td className="p-4 font-medium">
                                                    <select name="logitech_engaged" value={formData.logitech_engaged} onChange={handleInputChange} disabled={!canEditAll} className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}>
                                                        <option value="">Select</option>
                                                        <option value="Yes">Yes</option>
                                                        <option value="No">No</option>
                                                    </select>
                                                </td>
                                                <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Logitech AE Name</td>
                                                <td className="p-4 font-medium text-xs">
                                                    <input name="engaged_ae_name" value={formData.engaged_ae_name} onChange={handleInputChange} readOnly={!canEditAll} className={`w-full p-2.5 border border-gray-200 rounded-lg text-sm ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`} placeholder="Logitech AE Name" />
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Technical Support</td>
                                                <td className="p-4 font-medium" colSpan={3}>
                                                    <select name="technical_support" value={formData.technical_support} onChange={handleInputChange} disabled={!canEditAll} className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}>
                                                        <option value="">Select</option>
                                                        <option value="Yes">Yes</option>
                                                        <option value="No">No</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        </>
                                    )}

                                    {/* NEAT SPECIFIC */}
                                    {hasNeat && (
                                        <tr>
                                            <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Virtual Support</td>
                                            <td className="p-4 font-medium" colSpan={3}>
                                                <select name="virtual_support" value={formData.virtual_support} onChange={handleInputChange} disabled={!canEditAll} className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}>
                                                    <option value="">Select</option>
                                                    <option value="Yes">Yes</option>
                                                    <option value="No">No</option>
                                                </select>
                                            </td>
                                        </tr>
                                    )}

                                    {/* SHARED LOGITECH / NEAT FIELDS */}
                                    {(hasLogitech || hasNeat) && (
                                        <tr>
                                            <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Is this a Staged Roll out?</td>
                                            <td className="p-4 font-medium">
                                                <select name="staged_roll_out" value={formData.staged_roll_out} onChange={handleInputChange} disabled={!canEditAll} className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}>
                                                    <option value="">Select</option>
                                                    <option value="Yes">Yes</option>
                                                    <option value="No">No</option>
                                                </select>
                                            </td>
                                            <td className="p-4 bg-gray-50/50 font-semibold text-gray-500 text-xs">Estimated Budget Amount</td>
                                            <td className="p-4 font-medium">
                                                <select name="estimated_budget_amount" value={formData.estimated_budget_amount} onChange={handleInputChange} disabled={!canEditAll} className={`w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px] ${!canEditAll ? 'bg-gray-50 border-gray-100 cursor-not-allowed text-gray-500' : ''}`}>
                                                    <option value="">Select</option>
                                                    <option value="Under $10,000">Under $10,000</option>
                                                    <option value="$10,000 - $50,000">$10,000 - $50,000</option>
                                                    <option value="$50,000 - $100,000">$50,000 - $100,000</option>
                                                    <option value="$100,000 - $250,000">$100,000 - $250,000</option>
                                                    <option value="$250,000+">$250,000+</option>
                                                </select>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* NOTES */}
                {canEditAll && (
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase bg-gray-50 p-2 pl-4 rounded">Notes</h3>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500">Order Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows={4}
                                className="w-full p-4 border border-gray-200 rounded-xl text-sm medium text-gray-600"
                                placeholder="Enter internal notes here..."
                            />
                        </div>
                    </section>
                )}

                {/* FORM ACTIONS */}
                < div className="flex justify-end gap-4 py-8" >
                    {canEditAll && (
                        <button
                            type="submit"
                            disabled={saving || uploading}
                            className="bg-[#213643] text-white hover:bg-[#1a2b35] text-white font-semibold text-[15px] px-12 py-3 rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    )}
                </div >
            </form >

            {/* PRODUCT MODAL */}
            {
                showProductModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-gray-900">Add Product</h2>
                                <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors font-bold text-lg">×</button>
                            </div>
                            <div className="p-6 overflow-y-auto space-y-4">
                                {inventory.map((product) => {
                                    const outOfStock = isProductOutOfStock(product);
                                    return (
                                        <div key={product.id} className="p-4 border border-gray-100 rounded-2xl flex justify-between items-center hover:border-blue-200 transition-colors group">
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{product.product_name}</h4>
                                                <p className="text-xs text-gray-500">
                                                    {product.manufacturer} | {product.product_sku}
                                                    {product.bundle_type === 'bundle' && <span className="ml-2 text-orange-500 font-bold">[Bundle]</span>}
                                                </p>
                                                {outOfStock ? (
                                                    <p className="text-[10px] text-red-500 font-bold mt-1 animate-pulse uppercase">Out of Stock</p>
                                                ) : (
                                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight">
                                                        Stock Available: <span className="text-[#213643] font-extrabold">{product.stock_quantity || 0}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => !outOfStock && handleAddItem(product)}
                                                disabled={outOfStock}
                                                className={`${outOfStock
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-[#213643] text-white hover:bg-[#1a2b35] font-medium active:scale-95 group-hover:scale-105'
                                                    } px-4 py-2 rounded-xl text-xs font-bold transition-all transform shadow-md`}
                                            >
                                                {outOfStock ? 'Out of Stock' : 'Add to Order'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
}
