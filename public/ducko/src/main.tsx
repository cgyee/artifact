import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {BrowserRouter, Route, Routes} from "react-router";
import {Edit} from "./pages/Edit.tsx";
import Render from "./pages/Render.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<App/>} />
            <Route path={"/project/:projectId"} element={<Edit/>} />
            <Route path={"/project/:projectId/render"} element={<Render />} />
        </Routes>
    </BrowserRouter>
  </StrictMode>,
)
