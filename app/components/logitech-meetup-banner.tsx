/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from "react";

const banners = [
    {
        image: "/Logi-Meetup-2.png",
        tag: "Recently Added",
        title: "LOGITECH MEETUP 2",
        subtitle: "Upgrade your small USB-based meeting rooms",
        description:
            "Bring AI-based features into your small USB meeting rooms with Meetup 2. Compatible with Microsoft Teams, Zoom, and Google Meet.",
    },
    {
        image: "/LogitechSight.png",
        tag: "Featured Product",
        title: "LOGITECH SIGHT",
        subtitle: "Give everyone a better view of the meeting",
        description:
            "Logitech Sight helps capture people around the table, giving remote participants a more natural meeting experience.",
    },
    {
        image: "/Logitech-Schedular.png",
        tag: "Room Solution",
        title: "LOGITECH SCHEDULER",
        subtitle: "Simple meeting room scheduling",
        description:
            "Easily book rooms and manage meeting spaces with a clean scheduling display built for modern workplaces.",
    },
];

export function LogitechMeetup() {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % banners.length);
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    const currentBanner = banners[currentSlide];

    return (
        <div className="w-full flex justify-center">
            <div className="relative w-full max-w-[1900px] overflow-hidden bg-[#f3f3f3]">

                {/* ================= MOBILE ================= */}
                <div className="block lg:hidden">
                    <img
                        src={currentBanner.image}
                        alt={currentBanner.title}
                        className="w-full h-auto object-cover"
                    />

                    <div className="px-5 py-8 text-center">
                        <p className="text-gray-500 text-sm font-semibold mb-2">
                            {currentBanner.tag}
                        </p>

                        <h1 className="text-2xl font-bold text-black leading-tight">
                            {currentBanner.title}
                        </h1>

                        <h3 className="text-sm font-bold text-black mt-2">
                            {currentBanner.subtitle}
                        </h3>

                        <p className="text-sm text-gray-700 mt-4">
                            {currentBanner.description}
                        </p>
                    </div>
                </div>

                {/* ================= DESKTOP ================= */}
                <div className="hidden lg:block relative lg:h-[450px] xl:h-[360px] 2xl:h-[440px]">

                    {banners.map((banner, index) => (
                        <div
                            key={index}
                            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${currentSlide === index ? "opacity-100" : "opacity-0"
                                }`}
                            style={{ backgroundImage: `url('${banner.image}')` }}
                        />
                    ))}

                    {/* Text Content */}
                    <div className="relative z-10 flex flex-col justify-center h-full px-16 max-w-[620px]">
                        <p className="text-gray-500 text-sm font-semibold mb-3">
                            {currentBanner.tag}
                        </p>

                        <h1 className="text-4xl font-bold text-black leading-tight">
                            {currentBanner.title}
                        </h1>

                        <h3 className="text-base font-bold text-black mt-2">
                            {currentBanner.subtitle}
                        </h3>

                        <p className="text-lg text-gray-800 mt-6 leading-relaxed">
                            {currentBanner.description}
                        </p>

                        <button className="w-fit mt-7 px-10 py-2 border border-black rounded-full text-black hover:bg-black hover:text-white transition">
                            Explore
                        </button>
                    </div>
                </div>

                {/* Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-3">
                    {banners.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`h-2 w-2 rounded-full transition ${currentSlide === index ? "bg-black" : "bg-gray-400"
                                }`}
                        />
                    ))}
                </div>

            </div>
        </div>
    );
}