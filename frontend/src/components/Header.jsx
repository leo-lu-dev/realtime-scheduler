import styles from '../styles/Header.module.css'
import { Link } from 'react-router-dom'

function Header({ status }) {
    return (
        <header className={status==='protected' ? styles.headerCropped : styles.headerFull}>
            <div className={styles.left}>
                {
                    status==='protected' ? (
                        <><div to={status==='protected' ? "/home" : "/"} className={styles.title}>Dashboard</div></>  
                    ) : (
                        <><Link to={status==='protected' ? "/home" : "/"} className={styles.title}>Converge</Link></>
                    )
                }
            </div>
            <div className={styles.right}>
                {
                    status==='protected' ? (
                        <>
                            <Link to="/logout" className={styles.link}>Logout</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className={styles.link}>Log In</Link>
                            <button className={styles.button}>
                                <Link to="/register" className={styles.link}>Sign Up</Link>
                            </button>
                        </>
                    )
                }

                
            </div>   
        </header>
    )
}

export default Header