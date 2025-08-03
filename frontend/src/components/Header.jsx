import { useState } from 'react';
import styles from '../styles/Header.module.css';
import { Link, useSearchParams } from 'react-router-dom';
import Popup from './Popup';
import { useAuth } from '../auth/AuthContext';
import logo from '../assets/converge-rounded.png';

function Header() {
    const { isLoggedIn, isAuthLoaded } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const method = searchParams.get("popup");

    const openPopup = (method) => setSearchParams({ popup: method });
    const closePopup = () => setSearchParams({});

    return (
        <>
            <header className={styles.header}>
                <div className={styles.left}>
                    <Link to={isLoggedIn ? "/home" : "/"} className='title'>
                        <img src={logo} alt="Converge Logo" className={styles.logo} />
                        <span className={styles.title}>Converge</span>
                    </Link>
                </div>
                <div className={styles.right}>
                    {isAuthLoaded && (
                        isLoggedIn
                            ? <Link to="/logout" className='link'>Logout</Link>
                            : <>
                                <button className='link' onClick={() => openPopup('login')}>Log In</button>
                                <button className={styles.button} onClick={() => openPopup('register')}>Sign Up</button>
                            </>
                    )}

                </div>
            </header>

            {method && <Popup method={method} onClose={closePopup} />}
        </>
    );
}

export default Header;