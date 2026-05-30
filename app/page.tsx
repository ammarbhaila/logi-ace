/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";
import { useEffect } from "react";

import HowItWorks from "./components/how-it-works";
import { HeroSlider } from "./components/hero-slider";
import DeviceNavigation from "./components/oem-cards";



export default function Home() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any


  return (
    <div className="font-sans min-h-screen">
      <main className="bg-gray-50">
        {/* ✅ Background only for Quick Links section */}
        <section>
          {/* ✅ HeroSlider now outside background image area */}
          <div className="w-auto">
            <HeroSlider />
          </div>
        </section>


        <section id="devices">
          <DeviceNavigation />
        </section>


        <HowItWorks />
      </main>
    </div>
  );
}
