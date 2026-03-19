import React from 'react'
import Image from 'next/image'
import SignInFormClient from '@/modules/auth/components/sign-in-form-client'

function Page() {
  return (
    <>
      <Image src={'/login.svg'} alt='Logo' width={100} height={100} className='mx-auto mb-4' />
      <SignInFormClient />
    </>
  )
}

export default Page