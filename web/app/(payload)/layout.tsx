import config from '@payload-config'
import '@payloadcms/next/css'
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './admin/importMap'

async function serverFunction(args: any) {
    'use server'
    return handleServerFunctions({
        ...args,
        config,
        importMap,
    })
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <RootLayout
            config={config}
            importMap={importMap}
            serverFunction={serverFunction}
        >
            {children}
        </RootLayout>
    )
}
