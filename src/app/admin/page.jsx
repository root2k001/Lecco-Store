import RutaAdmin from '../../Compartidos/RutaAdmin/RutaAdmin.jsx';
import AdminDashboard from '../../PaginaAdmin/AdminDashboard.jsx';

export const metadata = {
    title: 'Panel de administración',
    robots: { index: false, follow: false }
};

export default function PaginaAdmin() {
    return (
        <RutaAdmin>
            <AdminDashboard />
        </RutaAdmin>
    );
}
