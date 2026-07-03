import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createBrowserRouter} from "react-router";
import {Edit} from "./pages/Edit.tsx";
import View from "./pages/View.tsx";
import {RouterProvider} from "react-router/dom";


const router = createBrowserRouter([
    {path: "/", element: <App/>},
    {path:"/project/:projectId", element: <Edit/>},
    {path:"view/project/:projectId", element:<View/>}
])
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
