'use client'

import StepCard from "./step-card"



const STEPS = [
  { title: 'CREATE DEMO KIT', description: 'Choose between different products for a 30-days demo', icon: 'step1.png', number: 1 },
  { title: 'CHECKOUT', description: 'Fill out the form with shipping & opportunity details and checkout easily', icon: 'step3 (2).png', number: 2 },
  { title: 'ORDER APPROVAL', description: 'Your order will be reviewed and approved by the Program Manager', icon: 'step2.png', number: 3 },
  { title: 'ORDER SHIPMENT', description: 'Seamless overnight shipment to customer after order approval', icon: 'step3.png', number: 4 },
  { title: 'ORDER RETURN', description: 'Simple order return using hard/soft copy of provided prepaid return label', icon: 'step4.png', number: 5 },
  { title: 'REPORT A WIN', description: 'Close customer after demo period and enter win details', icon: 'htw5.png', number: 6 },
]

export default function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-white lg:py-4 pt-10 md:pt-0">
      <div className="max-w-[1900px] mx-auto w-full px-4 sm:px-6 md:px-10 lg:px-16 xl:px-20 ">
        <h2 className="text-[27px] font-semibold font-inter text-center text-gray-900 mb-10 md:mb-15">
          How it Works
        </h2>


        {/* ✅ Responsive Grid */}
        <div
          className="
            grid 
            grid-cols-1 
            md:grid-cols-2 
            lg:grid-cols-3
            gap-10 
            sm:gap-10
            md:gap-10
            lg:gap-10
            xl:gap-18
            2xl:gap-10
            justify-items-center
            px-5 md:px-0
          "
        >
          {STEPS.map((step) => (
            <StepCard key={step.number} {...step} />
          ))}
        </div>
      </div>
    </section>
  )
}