import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";
import { AuthProvider } from "./lib/auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Links from "./pages/Links";
import LinkNew from "./pages/LinkNew";
import LinkDetail from "./pages/LinkDetail";
import CaseStudies from "./pages/CaseStudies";
import CaseStudyEdit from "./pages/CaseStudyEdit";
import Viewer from "./pages/Viewer";
import NotFound from "./pages/NotFound";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/v/:slug" element={<Viewer />} />
          <Route path="/app/login" element={<Login />} />
          <Route path="/app" element={<Layout />}>
            <Route index element={<Links />} />
            <Route path="links/new" element={<LinkNew />} />
            <Route path="links/:id" element={<LinkDetail />} />
            <Route path="case-studies" element={<CaseStudies />} />
            <Route path="case-studies/new" element={<CaseStudyEdit />} />
            <Route path="case-studies/:id" element={<CaseStudyEdit />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
