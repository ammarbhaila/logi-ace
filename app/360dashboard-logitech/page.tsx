
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { Suspense } from "react"

function DashboardSkeleton() {
    return (
        <div className="w-full min-h-screen bg-gray-50 px-4 sm:px-6 md:px-8 lg:px-10 lg:py-20 flex justify-center">
            <div className="w-full max-w-[1350px] space-y-10">
                <div className="relative w-full h-[80vh] bg-gray-200 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
                    <div className="absolute inset-0">
                        <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-[shimmer_2s_infinite]" />
                    </div>
                </div>
            </div>
        </div>
    )
}

function DashboardContent() {
    // 1. If you have an embed URL from Power BI (e.g. from "Publish to Web" or "Embed in SharePoint/Website"), paste it here.
    const powerBiUrl = "https://app.powerbi.com/view?r=eyJrIjoiNTk2NDQ0YTEtMmRiMC00ZTI5LTlhZjUtZmFmYTdjNGIwZDVlIiwidCI6ImY2MzFmNGVmLWMzYmItNDU5OC04NWZmLTM2OTNlNzZmMmZmYiIsImMiOjZ9"

    return (
        <div className="w-full min-h-screen bg-gray-50 px-4 sm:px-6 md:px-8 lg:px-10 flex justify-center md:pt-0">
            <div className="w-full max-w-[1350px] space-y-10 mt-6 sm:mt-10">
                <div className="space-y-3 sm:space-y-4">
                    <div className="w-full h-[80vh] md:h-[90vh] overflow-hidden rounded-lg shadow-sm border border-gray-200 bg-white">
                        <iframe
                            title="Power BI Dashboard"
                            width="100%"
                            height="100%"
                            src={powerBiUrl}
                            frameBorder="0"
                            allowFullScreen={true}
                            className="w-full h-full"
                        ></iframe>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent />
        </Suspense>
    )
}