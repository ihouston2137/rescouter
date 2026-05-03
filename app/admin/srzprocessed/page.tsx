import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import SrzProcessedEditor from './SrzProcessedEditor'

export const metadata = { title: 'SRz Processed — Admin' }

export default async function SrzProcessedPage() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')
  return <SrzProcessedEditor />
}
