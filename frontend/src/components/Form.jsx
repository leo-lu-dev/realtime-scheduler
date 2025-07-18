import { useState } from 'react'
import api from '../api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function Form({route, method}) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const { login } = useAuth()

    const name = method === 'login' ? 'Login' : 'Register'

    const handleSubmit = async (e) => {
        setLoading(true);
        e.preventDefault();

        try {
            const res = await api.post(route, {email, password})
            if (method === 'login') {
                login(res.data.access, res.data.refresh)
                navigate('/home')
            }
            else{
                navigate('/login')
            }
        }
        catch (error) {
            alert(error)
        }
        finally {
            setLoading(false)
        }
    }

    return <form onSubmit={handleSubmit} className='form-container'>
        <h1>{name}</h1>
        <input
            className = 'form-input'
            type = 'text'
            value = {email}
            onChange = {(e) => setEmail(e.target.value)}
            placeholder = 'Email'
        />
        <input
            className = 'form-input'
            type = 'password'
            value = {password}
            onChange = {(e) => setPassword(e.target.value)}
            placeholder = 'Password'
        />
        <button className='form-button' type='submit'>
            Submit
        </button>
    </form>
}

export default Form