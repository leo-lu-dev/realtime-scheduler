import Header from './Header'
import { Outlet } from 'react-router-dom'

function PublicLayout() {
  return (
    <>
      <Header status='public' />
      <main className="p-4">
        <Outlet />
      </main>
    </>
  )
}

export default PublicLayout