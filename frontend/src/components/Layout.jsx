import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Header from './Header';
import styles from '../styles/Layout.module.css';

function Layout() {
  const { isLoggedIn, isAuthLoaded } = useAuth();

  if (!isAuthLoaded) return null;

  return (
    <>
      <Header />
      <div className={styles.layout}>
        <div className={styles.body}>
          {isLoggedIn && (
            <div className={styles.sidebar}>
              <Link to='/schedules' className='link'>Schedules</Link>
              <Link to='/groups' className='link'>Groups</Link>
            </div>
          )}
          <main className={styles.main}>
            <Outlet />
          </main>
        </div>
      </div>

    </>
  );
}

export default Layout;
