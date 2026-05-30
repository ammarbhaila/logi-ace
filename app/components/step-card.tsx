/* eslint-disable @next/next/no-img-element */
'use client'

interface StepCardProps {
  icon: string
  title: string
  description: string
  number: number
}

export default function StepCard({ icon, title, description, number }: StepCardProps) {
  return (
    <div className="group relative w-full max-w-[420px]  overflow-visible pb-10">
      {/* ORANGE frame (under card, no negative z) */}
      <div className="pointer-events-none absolute -top-4 -left-4 h-50 w-85  lg:w-65 xl:w-75 2xl:w-85 rounded-2xl border border-[#e28743] z-0" />

      {/* BLUE top-left corner (under card) */}
      <div className="pointer-events-none absolute -top-4 -left-4 h-14 w-14 border-t-[5px] border-l-[5px] border-[#253746] rounded-tl-2xl transition-all duration-500 ease-in-out group-hover:h-20 group-hover:w-20 z-0" />

      {/* MAIN CARD (above decorations) */}
      <div className="relative z-10 w-full rounded-3xl border border-gray-200 bg-gray-50 px-6 py-6 pt-20 shadow-xl min-h-[220px]">
        {/* Icon */}
        <div className="absolute left-10 top-5 -translate-x-1/2">
          <div className="relative h-20 w-20">
            {/* Remove the circle and gradient effect */}
            <div className="absolute inset-0 bg-transparent shadow-none transition-all duration-500 ease-in-out group-hover:from-[#e9e9e9] group-hover:to-[#d9d9d9]" />
            <div className="absolute inset-[6px] flex items-center justify-center rounded-none border-none bg-transparent">
              <img src={icon} alt={title} className="h-9 w-9 object-contain" />
            </div>
          </div>
        </div>


        {/* Text */}
        <div className="mt-5 flex flex-col space-y-2 text-left">
          <h3 className="text-[19px] font-semibold tracking-wide text-gray-600">{title}</h3>
          <p className="font-inter text-[13px] font-normal leading-relaxed text-gray-600">{description}</p>
        </div>

        {/* NUMBER badge (top layer) */}
        <div className="absolute -right-3 -bottom-3 z-30">
          <div className="flex h-14 w-14 items-center justify-center rounded-tl-3xl bg-[#253746] text-2xl font-bold text-white shadow-md">
            {number}
          </div>
        </div>
      </div>

      {/* BLUE chip behind number (between frame and badge) */}
      <div className="pointer-events-none absolute -right-1 bottom-9  h-20 w-20 rounded-bl-2xl rounded-tr-2xl bg-[#253746] translate-x-2 translate-y-2 z-0" />
    </div>
  )
}