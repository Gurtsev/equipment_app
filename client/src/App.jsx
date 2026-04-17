import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import AssetsPage from './pages/AssetsPage';
import AssetDetailPage from './pages/AssetDetailPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ScanPage from './pages/ScanPage';

const qc = new QueryClient();

const router = createBrowserRouter([
    { path: '/', element: <Navigate to="/assets" replace /> },
    { path: '/assets', element: <Layout><AssetsPage /></Layout> },
    { path: '/assets/:id', element: <Layout><AssetDetailPage /></Layout> },
    { path: '/projects', element: <Layout><ProjectsPage /></Layout> },
    { path: '/projects/:id', element: <Layout><ProjectDetailPage /></Layout> },
    { path: '/scan', element: <Layout><ScanPage /></Layout> },
]);

export default function App() {
    return (
        <QueryClientProvider client={qc}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    );
}
