import { useState } from 'react';
import styles from '../styles/Header.module.css';
import { Link, useSearchParams } from 'react-router-dom';
import Popup from './Popup';
import { PopupContext } from '../context/PopupContext';
import logo from '../assets/converge-rounded.png';

function Header({ status }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const method = searchParams.get("popup");

    const openPopup = (method) => setSearchParams({ popup: method });
    const closePopup = () => setSearchParams({});

    return (
        <>
            <header className={styles.header}>
                <div className={styles.left}>
                    <Link to={status === 'protected' ? "/home" : "/"} className='title'>
                        <img src={logo} alt="Converge Logo" className={styles.logo} />
                        <span className={styles.title}>Converge</span>
                    </Link>
                </div>
                <div className={styles.right}>
                    {
                        status === 'protected' ? (
                            <Link to="/logout" className='link'>Logout</Link>
                        ) : (
                            <>
                                <button className='link' onClick={() => openPopup('login')}>Log In</button>
                                <button className={styles.button} onClick={() => openPopup('register')}>Sign Up</button>
                            </>
                        )
                    }
                </div>
            </header>

            {method && <Popup method={method} onClose={closePopup} />}
        </>
    );
}

export default Header;