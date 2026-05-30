'use client'

import dynamic from 'next/dynamic'

// Dynamically import Header — client-side only
const Header = dynamic(() => import('./header'), { ssr: false })

export default function HeaderWrapper() {
  return <Header />
}
