import './App.css'
import {Navigate} from "react-router";

function App() {

  const projectId  = crypto.randomUUID()
  return (
      <Navigate to={`/project/${projectId}`} />
  )
}

export default App
