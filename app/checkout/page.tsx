"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useCart } from '@/app/context/CartContext'; // Assuming CartContext is set up correctly
import React, { ChangeEvent, FormEvent } from 'react';

export default function CheckoutPage() {
  const { items, clear } = useCart(); // Get cart items and clear function from context
  const router = useRouter();

  const [session, setSession] = useState<any>(null); // Store session info
  const [formData, setFormData] = useState({
    // Team Details (Common for all)
    salesExecutive: '',
    salesExecutiveEmail: '',
    salesManager: '',
    salesManagerEmail: '',

    // Shipping Details (Common for all)
    customerCompanyName: '',
    customerContactName: '',
    customerContactEmail: '',
    customerShippingAddress: '',
    city: '',
    state: '',
    zip: '',

    // Opportunity Details (Common for all)
    deviceOpportunitySizeUnits: '',
    revenueOpportunitySize: '',
    crmAccount: '',
    segment: '',
    estimatedClosedDate: '',
    opportunityLink: '',
    notes: '',

    // Device-Specific (Poly, Logitech, Neat)
    approvedDealReg: '',   //logitech, poly
    regNumber: '',         //logitech, poly
    platform: '',       //logitech,neat   
    customerPlanningVersion: '',  //poly
    inHouseExpertise: '', //poly
    technicalResource: '', //poly
    roomUpgrade: '',  //neat,logitech
    expectedParticipants: '',  //neat,logitech
    technicalSupport: '', //logitech
    logitechEngaged: '', //logitech
    engagedAENAME: '', //logitech
    virtualSupport: '', //neat
  });

  useEffect(() => {
    // Fetch session and profile on page load
    const checkSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        setSession(currentSession);

        try {
          // Fetch detailed profile to get first and last name
          const res = await fetch('/api/auth/me');
          const profile = await res.json();

          if (!profile.error) {
            const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
            setFormData((prev) => ({
              ...prev,
              salesExecutive: fullName || profile.email || '',
              salesExecutiveEmail: profile.email || '',
            }));
          } else {
            // Fallback to session data if profile fetch fails
            setFormData((prev) => ({
              ...prev,
              salesExecutive: currentSession.user?.email || '',
              salesExecutiveEmail: currentSession.user?.email || '',
            }));
          }
        } catch (err) {
          console.error('[DEBUG] Failed to fetch profile for checkout:', err);
          // Fallback
          setFormData((prev) => ({
            ...prev,
            salesExecutive: currentSession.user?.email || '',
            salesExecutiveEmail: currentSession.user?.email || '',
          }));
        }
      }
    };

    checkSession(); // Run session check on component mount
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Your cart is empty. Please add products before placing an order.');
      return;
    }

    // Check if product_id is missing in any of the cart items
    for (const item of items) {
      if (!item.product_id) {
        alert('Product ID is missing in the cart items!');
        return;
      }
    }

    const response = await fetch('/api/cart/submit-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: session?.user?.id, // This should come from your session or user context
        cartItems: items,
        formData,
      }),
    });

    const responseData = await response.json();
    console.log('[DEBUG] Response from backend:', responseData); // Log the response from the API

    if (response.ok) {
      // Trigger the standalone email API separately
      try {
        fetch('/api/email/order-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: responseData.orderId,
            userEmail: formData.customerContactEmail || formData.salesExecutiveEmail,
            formData,
            cartItems: items
          })
        });
        console.log('[DEBUG] Email API triggered from checkout page');
      } catch (err) {
        console.error('[DEBUG] Failed to trigger email API:', err);
      }

      clear(); // Clear the cart
      router.push(`/thank-you?orderId=${responseData.orderId}`); // Redirect to thank-you page
    } else {
      alert('Failed to submit order');
    }
  };



  // Render Opportunity Details Based on OEM Type
  const renderOpportunityDetails = () => {
    return (
      <>
        {/* Common Opportunity Details for all OEMs */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Device Opportunity Size (Units) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="deviceOpportunitySizeUnits"
            value={formData.deviceOpportunitySizeUnits}
            onChange={handleInputChange}
            placeholder=""
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-[14px]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Revenue Opportunity Size <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="revenueOpportunitySize"
            value={formData.revenueOpportunitySize}
            onChange={handleInputChange}
            placeholder=""
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-[14px]"
          />
        </div>


        {/* Conditional fields based on OEM Type */}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Does your customer need a technical resource to demo this equipment? <span className="text-red-500">*</span>
          </label>
          <select
            name="technicalResource"
            value={formData.technicalResource}
            onChange={handleInputChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
          >
            <option value=""></option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        {items.some(item => item.oem?.toLowerCase() === 'poly') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                If so, do you have the in-house expertise to do so? <span className="text-red-500">*</span>
              </label>
              <select
                name="inHouseExpertise"
                value={formData.inHouseExpertise}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              >
                <option value=""></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What version is your customer planning to use? <span className="text-red-500">*</span>
              </label>
              <select
                name="customerPlanningVersion"
                value={formData.customerPlanningVersion}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              >
                <option value=""></option>
                <option value="Zoom Mode">Zoom Mode</option>
                <option value="Teams Mode">Teams Mode</option>
                <option value="Poly Mode">Poly Mode</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approved Deal Reg <span className="text-red-500">*</span>
              </label>
              <select
                name="approvedDealReg"
                value={formData.approvedDealReg}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              >
                <option value=""></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reg # <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="regNumber"
                value={formData.regNumber}
                onChange={handleInputChange}
                placeholder=""
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-[14px]"
              />
            </div>
          </>
        )}

        {items.some(item => item.oem?.toLowerCase() === 'logitech') && (
          <>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approved Deal Reg <span className="text-red-500">*</span>
              </label>
              <select
                name="approvedDealReg"
                value={formData.approvedDealReg}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              >
                <option value=""></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reg # <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="regNumber"
                value={formData.regNumber}
                onChange={handleInputChange}
                placeholder=""
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-[14px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How many rooms is the customer looking to upgrade? <span className="text-red-500">*</span>
              </label>
              <select
                name="roomUpgrade"
                value={formData.roomUpgrade}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              >
                <option value=""></option>
                {[...Array(10).keys()].map((n) => (
                  <option key={n + 1} value={n + 1}>
                    {n + 1}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How many participants expected for each room? <span className="text-red-500">*</span>
              </label>
              <select
                name="expectedParticipants"
                value={formData.expectedParticipants}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              >
                <option value=""></option>
                <option value="1-2">1-2</option>
                <option value="2-4">2-4</option>
                <option value="4-8">4-8</option>
                <option value="8-12">8-12</option>
                <option value="12-20">12-20</option>
                <option value="20-46">20-46</option>
                <option value="46+">46+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Does your customer need technical support for setup? <span className="text-red-500">*</span>
              </label>
              <select
                name="technicalSupport"
                value={formData.technicalSupport}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              >
                <option value=""></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Has a Logitech AE been engaged? <span className="text-red-500">*</span>
              </label>
              <select
                name="logitechEngaged"
                value={formData.logitechEngaged}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              >
                <option value=""></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logitech AE Name (If Logitech AE Engaged) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="engagedAENAME"
                value={formData.engagedAENAME}
                onChange={handleInputChange}
                placeholder=""
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-[14px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Platform <span className="text-red-500">*</span>
              </label>
              <select
                name="platform"
                value={formData.platform}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              >
                <option value=""></option>
                <option value="Microsoft Teams">Microsoft Teams</option>
                <option value="Zoom">Zoom</option>
                <option value="Google">Google</option>
              </select>
            </div>

          </>
        )}

        {items.some(item => item.oem?.toLowerCase() === 'neat') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How many rooms is the customer looking to upgrade? <span className="text-red-500">*</span>
              </label>
              <select
                name="roomUpgrade"
                value={formData.roomUpgrade}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              >
                <option value="">Select number of rooms</option>
                {[...Array(10).keys()].map((n) => (
                  <option key={n + 1} value={n + 1}>
                    {n + 1}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How many participants expected for each room? <span className="text-red-500">*</span>
              </label>
              <select
                name="expectedParticipants"
                value={formData.expectedParticipants}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              >
                <option value="">Select expected participants</option>
                <option value="1-2">1-2</option>
                <option value="2-4">2-4</option>
                <option value="4-8">4-8</option>
                <option value="8-12">8-12</option>
                <option value="12-20">12-20</option>
                <option value="20-46">20-46</option>
                <option value="46+">46+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Does your customer need virtual support for setup? <span className="text-red-500">*</span>
              </label>
              <select
                name="virtualSupport"
                value={formData.virtualSupport}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Which platform is your customer planning to use? <span className="text-red-500">*</span>
              </label>
              <select
                name="platform"
                value={formData.platform}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              >
                <option value="">Select Platform</option>
                <option value="Microsoft Teams">Microsoft Teams</option>
                <option value="Zoom">Zoom</option>
              </select>
            </div>
          </>
        )}


        {/* Add the 5 fields for CRM Account #, Segment, Estimated Close Date, Opportunity Link, and Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CRM Account # <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="crmAccount"
            value={formData.crmAccount}
            onChange={handleInputChange}
            placeholder=""
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-[14px]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Segment <span className="text-red-500">*</span>
          </label>
          <select
            name="segment"
            value={formData.segment}
            onChange={handleInputChange}
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
          >
            <option value=""></option>
            <option value="Global">Global</option>
            <option value="Strategic/Stratascale">Strategic/Stratascale</option>
            <option value="Enterprise">Enterprise</option>
            <option value="Commercial">Commercial</option>
            <option value="Public Sector Field">Public Sector Field</option>
            <option value="Federal">Federal</option>
            <option value="Public Sector Inside">Public Sector Inside</option>
            <option value="Federal/Healthcare">Federal/Healthcare</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Close Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="estimatedClosedDate"
            value={formData.estimatedClosedDate}
            onChange={handleInputChange}
            min={new Date().toLocaleDateString('en-CA')}
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-[14px]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Opportunity Link (URL) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="opportunityLink"
            value={formData.opportunityLink}
            onChange={handleInputChange}
            // placeholder="e.g. www.google.com"
            required
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-[14px]"
          />
        </div>
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Any additional notes"
            rows={4}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-[14px]"
          />
        </div>
      </>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 min-h-screen font-sans">
      <h1 className="text-3xl font-bold text-center text-[#000000] mb-6">Checkout</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Team Details (Common for all) */}
        <section className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
          <div className="bg-[#99a1af] text-white px-4 py-2 rounded-t-md text-lg font-semibold">
            <h3 className="text-lg font-bold">Team Details</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/30">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales Executive <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="salesExecutive"
                value={formData.salesExecutive}
                onChange={handleInputChange}
                placeholder=""
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales Executive Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="salesExecutiveEmail"
                value={formData.salesExecutiveEmail}
                onChange={handleInputChange}
                placeholder=""
                required
                disabled
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales Manager <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="salesManager"
                value={formData.salesManager}
                onChange={handleInputChange}
                placeholder=""
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales Manager Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="salesManagerEmail"
                value={formData.salesManagerEmail}
                onChange={handleInputChange}
                placeholder=""
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              />
            </div>
          </div>
        </section>

        {/* Shipping Details (Common for all) */}
        <section className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
          <div className="bg-[#99a1af] text-white px-4 py-2 rounded-t-md text-lg font-semibold">
            <h3 className="text-lg font-bold">Shipping Details</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/30">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="customerCompanyName"
                value={formData.customerCompanyName}
                onChange={handleInputChange}
                placeholder=""
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receiver name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="customerContactName"
                value={formData.customerContactName}
                onChange={handleInputChange}
                placeholder=""
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receiver Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="customerContactEmail"
                value={formData.customerContactEmail}
                onChange={handleInputChange}
                placeholder=""
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipping Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="customerShippingAddress"
                value={formData.customerShippingAddress}
                onChange={handleInputChange}
                placeholder=""
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              />
            </div> <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              >
                <option value=""></option>
                <option>Alabama</option>
                <option>Alaska</option>
                <option>Arizona</option>
                <option>Arkansas</option>
                <option>Canada</option>
                <option>California</option>
                <option>Colorado</option>
                <option>Connecticut</option>
                <option>Delaware</option>
                <option>District Of Columbia</option>
                <option>Florida</option>
                <option>Georgia</option>
                <option>Hawaii</option>
                <option>Idaho</option>
                <option>Illinois</option>
                <option>Indiana</option>
                <option>Iowa</option>
                <option>Kansas</option>
                <option>Kentucky</option>
                <option>Louisiana</option>
                <option>Maine</option>
                <option>Maryland</option>
                <option>Massachusetts</option>
                <option>Michigan</option>
                <option>Minnesota</option>
                <option>Mississippi</option>
                <option>Missouri</option>
                <option>Montana</option>
                <option>Nebraska</option>
                <option>Nevada</option>
                <option>New Hampshire</option>
                <option>New Jersey</option>
                <option>New Mexico</option>
                <option>New York</option>
                <option>North Carolina</option>
                <option>North Dakota</option>
                <option>Ohio</option>
                <option>Oklahoma</option>
                <option>Oregon</option>
                <option>Pennsylvania</option>
                <option>Rhode Island</option>
                <option>South Carolina</option>
                <option>South Dakota</option>
                <option>Tennessee</option>
                <option>Texas</option>
                <option>Utah</option>
                <option>Vermont</option>
                <option>Virginia</option>
                <option>Washington</option>
                <option>West Virginia</option>
                <option>Wisconsin</option>
                <option>Wyoming</option>
                <option>Armed Forces (AA)</option>
                <option>Armed Forces (AE)</option>
                <option>Armed Forces (AP)</option><option>Alabama</option>
                <option>Alaska</option>
                <option>Arizona</option>
                <option>Arkansas</option>
                <option>Canada</option>
                <option>California</option>
                <option>Colorado</option>
                <option>Connecticut</option>
                <option>Delaware</option>
                <option>District Of Columbia</option>
                <option>Florida</option>
                <option>Georgia</option>
                <option>Hawaii</option>
                <option>Idaho</option>
                <option>Illinois</option>
                <option>Indiana</option>
                <option>Iowa</option>
                <option>Kansas</option>
                <option>Kentucky</option>
                <option>Louisiana</option>
                <option>Maine</option>
                <option>Maryland</option>
                <option>Massachusetts</option>
                <option>Michigan</option>
                <option>Minnesota</option>
                <option>Mississippi</option>
                <option>Missouri</option>
                <option>Montana</option>
                <option>Nebraska</option>
                <option>Nevada</option>
                <option>New Hampshire</option>
                <option>New Jersey</option>
                <option>New Mexico</option>
                <option>New York</option>
                <option>North Carolina</option>
                <option>North Dakota</option>
                <option>Ohio</option>
                <option>Oklahoma</option>
                <option>Oregon</option>
                <option>Pennsylvania</option>
                <option>Rhode Island</option>
                <option>South Carolina</option>
                <option>South Dakota</option>
                <option>Tennessee</option>
                <option>Texas</option>
                <option>Utah</option>
                <option>Vermont</option>
                <option>Virginia</option>
                <option>Washington</option>
                <option>West Virginia</option>
                <option>Wisconsin</option>
                <option>Wyoming</option>
                <option>Armed Forces (AA)</option>
                <option>Armed Forces (AE)</option>
                <option>Armed Forces (AP)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder=""
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="zip"
                value={formData.zip}
                onChange={handleInputChange}
                placeholder=""
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-[14px]"
              />
            </div>
          </div>
        </section>

        {/* Opportunity Details (Conditional) */}
        <section className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
          <div className="bg-[#99a1af] text-white px-4 py-2 rounded-t-md text-lg font-semibold">
            <h3 className="text-lg font-bold">Opportunity Details</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/30">
            {renderOpportunityDetails()}
          </div>
        </section>

        {/* Your Order Section */}
        <section className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 mb-8">
          <div className="bg-gray-50/30">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 px-6 font-semibold bg-[#99a1af] text-white text-[18px]">Product</th>
                  <th className="py-2 px-6 font-semibold bg-[#99a1af] text-white text-center w-32 text-[18px]">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map(item => (
                    <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                      <td className="py-4 px-6 bg-white">
                        <div className="flex items-start gap-4">
                          {/* Product Thumbnail */}
                          {/* <div className="w-16 h-16 flex-shrink-0 bg-white border border-gray-100 rounded-md p-1 flex items-center justify-center">
                            {item.main_image_url ? (
                              <img
                                src={item.main_image_url}
                                alt={item.product_name}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <div className="text-[10px] text-gray-300">No Image</div>
                            )}
                          </div> */}

                          <div className="flex-1">
                            <div className="font-medium text-[15px] text-gray-900 mb-0.5">{item.product_name}</div>
                            {item.product_sku && (
                              <div className="text-[12px] text-gray-500 mb-2">SKU: {item.product_sku}</div>
                            )}

                            {/* BUNDLE ITEMS DISPLAY */}
                            {item.bundleItems && item.bundleItems.length > 0 && (
                              <div className="mt-1 pl-3 text-xs text-gray-600 space-y-1 border-l-2 border-gray-200">
                                {item.bundleItems.map((bItem) => (
                                  <div key={bItem.id} className="flex gap-2">
                                    <span className="text-gray-400">•</span>
                                    <span>{bItem.product_name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center font-medium text-sm text-gray-900 bg-white">
                        <span className="text-gray-400 mr-1.5 text-sm">×</span>{item.quantity}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-8 px-4 text-center text-gray-500 bg-white">
                      No items in cart
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Submit Button */}
        <div className="flex justify-center mt-8 pb-10">
          <button
            type="submit"
            disabled={items.length === 0}
            className={`font-medium py-3 px-16 rounded-full shadow-lg transition-all transform text-lg ${items.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-[#C65326] hover:bg-[#b05229] text-white hover:scale-105'
              }`}
          >
            Place Order
          </button>
        </div>
      </form>
    </div>
  );
}
