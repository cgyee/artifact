import './App.css'
import {useEffect} from 'react'

function App() {
  useEffect(() => {
    window.location.replace('/api/project/new')
  }, [])
  return null
}

export default App
