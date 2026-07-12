import './App.css'
import {useEffect} from 'react'

function App() {
  useEffect(() => {
    // TODO changes this to check if user is logged in then redirect to dashboard or login
    window.location.replace('/api/project/new')
  }, [])
  return null
}

export default App
