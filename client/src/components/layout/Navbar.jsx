import { NavLink } from 'react-router-dom';

export default function Navbar() {
    return (
        <nav className="navbar">
            <span className="navbar-brand">EquipTrack</span>
            <div className="navbar-links">
                <NavLink to="/assets" className={({ isActive }) => isActive ? 'active' : ''}>Оборудование</NavLink>
                <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : ''}>Проекты</NavLink>
                <NavLink to="/scan" className={({ isActive }) => `nav-scan ${isActive ? 'active' : ''}`}>Сканер</NavLink>
            </div>
        </nav>
    );
}
