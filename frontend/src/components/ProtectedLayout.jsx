import styles from '../styles/ProtectedLayout.module.css'
import Header from './Header'
import { Outlet } from 'react-router-dom'
import { Link } from 'react-router-dom'

function ProtectedLayout() {
  return (
    <div className={styles.layout}>
      <Header status="protected" />
      <div className={styles.body}>
        <div className={styles.sidebar}>
          <Link to='/schedules' className='link'>Schedules</Link>
        </div>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default ProtectedLayout