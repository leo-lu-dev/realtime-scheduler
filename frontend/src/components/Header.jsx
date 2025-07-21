import styles from '../styles/Header.module.css'
import { Link } from 'react-router-dom'

function Header({ status }) {
    return (
        <header className={styles.header}>
            <div className={styles.left}>
                <Link to={status==='protected' ? "/home" : "/"} className='title'>Converge</Link>
            </div>
            <div className={styles.right}>
                {
                    status==='protected' ? (
                        <>
                            <Link to="/logout" className='link'>Logout</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className='link'>Log In</Link>
                            <button className={styles.button}>
                                <Link to="/register" className='link'>Sign Up</Link>
                            </button>
                        </>
                    )
                }
            </div>   
        </header>
    )
}

export default Header