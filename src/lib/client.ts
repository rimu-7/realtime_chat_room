import { App } from '@/app/api/[[...slugs]]/route'
import { treaty } from '@elysiajs/eden'

const domain = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export const client = treaty<App>(domain).api