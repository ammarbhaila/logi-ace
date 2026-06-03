/* eslint-disable @next/next/no-img-element */
'use client';

import Link from "next/link";

export function HeroSlider() {
  const scrollToDevices = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('devices');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = '/inventory';
    }
  };

  return (
    <div className="w-full flex justify-center">
      <div className="relative w-full max-w-[1900px] overflow-hidden">

        {/* ================= MOBILE HERO ================= */}
        <div className="block lg:hidden bg-white">

          {/* Mobile Image */}
          {/* <img
            src="/web bannar.png"
            alt="Mobile Banner"
            className="w-full h-auto object-cover pt-3"
          /> */}

          {/* Mobile Content */}
          <div className="px-5 py-8 text-center">
            {/* <img
              src="/mainlogo.png"
              alt="Logo"
              className="h-10 mx-auto mb-4"
            /> */}

            <h1 className="text-xl font-bold text-black leading-tight ">
              UC Room Solutions
              Demo Kits

            </h1>

            <p className="text-sm text-gray-600 mt-3">
              Browse room solutions to create and send demo-kits in just a few simple steps. Logi-Ace has been developed to provide sales executives the unique opportunity to order demo-kits for their most valued customers. Checkout easy-to-use, high quality conferencing solutions for all room sizes in just a few simple steps and have them in your customer’s hands within days!
            </p>

            {/* <button
              onClick={scrollToDevices}
              className="mt-6 bg-[#C65326] border border-[#C65326] px-4 py-2 rounded-[6] font-semibold text-white hover:bg-[#b05229]"
            >
              Create Demo Kit
            </button> */}
          </div>
        </div>

        {/* ================= DESKTOP HERO ================= */}
        <div className="hidden lg:block  lg:h-[450px]  xl:h-[360px] 2xl:h-[440px]">

          {/* Desktop Background */}
          <div
            className="absolute inset-0 bg-cover bg-center "
            style={{ backgroundImage: "url('web bannar.png')" }}
          />

          {/* Desktop Content */}
          <div className="relative z-10 flex flex-col justify-center h-full px-16 max-w-4xl -translate-y-2">

            <h1 className="lg:text-3xl xl:text-4xl 2xl:text-4xl font-medium text-black leading-tight lg:max-w-[550px] xl:max-w-[550px] 2xl:max-w-[600px]">
              UC Room Solutions Demo Kits
            </h1>

            <p className="text-black font-normal text-lg lg:text-[13px] xl:text-[16px] 2xl:text-[18px] text-gray-800 mt-4 lg:max-w-[450px] xl:max-w-[560px] 2xl:max-w-[650px]">
              Browse room solutions to create and send demo-kits in just a few simple steps. Logi-Ace has been developed to provide sales executives the unique opportunity to order demo-kits for their most valued customers. Checkout easy-to-use, high quality conferencing solutions for all room sizes in just a few simple steps and have them in your customer’s hands within days!
            </p>


            <div className="flex justify-center lg:justify-start mt-6">

            </div>

            {/* <button
              onClick={scrollToDevices}
              className="w-fit font-medium mt-6 md:mt-2 bg-[#C65326] cursor-pointer border border-[#C65326] px-5 py-2.5 text-[15px] rounded-[2px] font-inter text-white hover:bg-[#b05229]"
            >
              Create Demo Kit
            </button> */}
          </div>
        </div>

      </div>
    </div>
  );
}