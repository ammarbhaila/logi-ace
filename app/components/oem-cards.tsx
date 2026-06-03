/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";

const devices = [
  {
    name: "Logitech",
    logo: "/homelogo1.png",
    image: "/image 77.png",
    link: "/oem/Logitech",
  },
];

export default function DeviceNavigation() {
  // Box ka size yahan change karein (chota: p-6, medium: p-10, bara: p-16)
  const boxPadding = "p-3";

  // Logo ki height yahan change karein
  const logoHeight = "h-11";

  // Product image ki height yahan change karein
  const imageHeight = "w-[196px]";

  // Gap between boxes yahan change karein
  const boxGap = "gap-10";

  return (
    <section className="bg-white py-8">
      <div className="max-w-[1200px] 2xl:max-w-[1358px] mx-auto px-6 sm:px-8 lg:px-12">
        {/* <h2 className="text-[26px] font-semibold text-gray-900 mb-10 pl-[15px]">
          Find devices from various manufacturers
        </h2> */}

        {/* GRID */}
        <div className="flex justify-center">
          {devices.map((item, index) => (
            <Link
              key={index}
              href={item.link}
              className={`
                max-w-[400px]
                w-full
                rounded-3xl
                border border-gray-300
                bg-white
                flex flex-col
                overflow-hidden
                hover:shadow-xl
                transition-all
                duration-300
                block
              `}
            >
              {/* HEADER (Logo) - White Background */}
              <div className="bg-white p-4 flex items-center justify-center h-[60px]">
                <img
                  src={item.logo}
                  alt={item.name}
                  className={`${logoHeight} object-contain mix-blend-multiply`}
                />
              </div>

              {/* BODY (Product + Button) - Gray Background */}
              <div className="bg-[#FAFAFA] flex-1 p-8 flex flex-col items-center justify-between gap-8">
                {/* Product Image */}
                <img
                  src={item.image}
                  alt={item.name}
                  className={`${imageHeight} object-contain`}
                />

                {/* Button */}
                {/* <a
                  href={item.link}
                  className="
                    border
                    border-gray-400
                    rounded-lg
                    px-7
                    py-2
                    text-gray-900
                    font-medium
                    hover:bg-gray-100
                    transition
                    bg-white
                  "
                >
                  Explore
                </a> */}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}