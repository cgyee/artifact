import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createBrowserRouter} from "react-router";
import {Edit} from "./pages/Edit.tsx";
import View from "./pages/View.tsx";
import {RouterProvider} from "react-router/dom";
import Signup from "./pages/Signup.tsx";


const router = createBrowserRouter([
    {path: "/", element: <App/>},
    {path:"/project/:projectId", element: <Edit/>},
    {path:"view/project/:projectId", element:<View/>},
    {path: '/login', element:<Signup/>}
])
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
