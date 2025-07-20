import styles from '../styles/Sidebar.module.css'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function Sidebar() {
    const { isLoggedIn } = useAuth()

    return isLoggedIn && (
        <div className={styles.layout}>
            <Link to='/home' className={styles.title}>Converge</Link>
        </div>
    )
}

export default Sidebar

                    // isLoggedIn && (
                    //     <>
                    //         <Link to="/schedules" className={styles.link}>My Calendar</Link>
                    //         <Link to="/schedules" className={styles.link}>Groups</Link>
                    //     </>
                    // )