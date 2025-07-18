import styles from '../styles/Header.module.css'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function Header() {
    const { isLoggedIn } = useAuth()

    return (
        <header className={styles.header}>
            <div className={styles.left}>
                <Link to={isLoggedIn ? "/home" : "/"} className={styles.title}>Converge</Link>
            </div>
            <div className={styles.center}>
                {
                    isLoggedIn && (
                        <>
                            <Link to="/schedules" className={styles.link}>My Calendar</Link>
                            <Link to="/schedules" className={styles.link}>Groups</Link>
                        </>
                    )
                }
            </div>
            <div className={styles.right}>
                {
                    isLoggedIn ? (
                        <>
                            <Link to="/login" className={styles.link}>Profile</Link>
                            <Link to="/logout" className={styles.link}>Logout</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className={styles.link}>Log In</Link>
                            <button className={styles.button}>
                                <Link to="/register" className={styles.buttonlink}>Sign Up</Link>
                            </button>
                        </>
                    )
                }

                
            </div>   
        </header>
    )
}

export default Header