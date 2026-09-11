import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, PlusCircle, FileText, Clock, Users, BookOpen, BarChart3, Building, UserCog, Settings, Trash2 
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin, isManagement } = useAuth();

  const navClass = ({ isActive }) =>
    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
      isActive ? 'bg-amber-500 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={onClose} />}

      <aside className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 pt-16 flex flex-col transition-transform duration-200 ease-in-out no-print lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 space-y-1 overflow-y-auto flex-1">
          <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Core</p>
          <NavLink to="/" end className={navClass} onClick={onClose}>
            <LayoutDashboard className="w-4 h-4" /><span>Dashboard</span>
          </NavLink>
          <NavLink to="/loans/new" className={navClass} onClick={onClose}>
            <PlusCircle className="w-4 h-4 text-emerald-500" /><span>New Pledge Loan</span>
          </NavLink>
          <NavLink to="/loans" end className={navClass} onClick={onClose}>
            <FileText className="w-4 h-4" /><span>All Loans</span>
          </NavLink>
          <NavLink to="/loans/overdue" className={navClass} onClick={onClose}>
            <Clock className="w-4 h-4 text-rose-500" /><span>Overdue Loans</span>
          </NavLink>
          <NavLink to="/customers" className={navClass} onClick={onClose}>
            <Users className="w-4 h-4" /><span>Customers</span>
          </NavLink>

          <p className="px-3 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Financials</p>
          <NavLink to="/day-book" className={navClass} onClick={onClose}>
            <BookOpen className="w-4 h-4" /><span>Day Book</span>
          </NavLink>
          <NavLink to="/reports" className={navClass} onClick={onClose}>
            <BarChart3 className="w-4 h-4" /><span>Reports</span>
          </NavLink>

          {isManagement && (
            <>
              <p className="px-3 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Management</p>
              <NavLink to="/branches" className={navClass} onClick={onClose}>
                <Building className="w-4 h-4" /><span>Branches</span>
              </NavLink>
              <NavLink to="/recycle-bin" className={navClass} onClick={onClose}>
                <Trash2 className="w-4 h-4" /><span>Recycle Bin</span>
              </NavLink>
            </>
          )}

          {isAdmin && (
            <>
              <p className="px-3 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Admin</p>
              <NavLink to="/staff" className={navClass} onClick={onClose}>
                <UserCog className="w-4 h-4" /><span>Staff & Users</span>
              </NavLink>
              <NavLink to="/settings" className={navClass} onClick={onClose}>
                <Settings className="w-4 h-4" /><span>Settings</span>
              </NavLink>
            </>
          )}
        </div>
      </aside>
    </>
  );
}