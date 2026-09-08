import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Edit2, Trash2, X, Store } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Vendors() {
    const [vendors, setVendors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentVendor, setCurrentVendor] = useState({
        name: '',
        phone: '',
        service_category: '',
        address: '',
        auto_assign: true,
        status: 'Active'
    });

    const API_URL = import.meta.env.VITE_API_URL || '/api';

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const res = await axios.get(`${API_URL}/vendors`);
            if (res.data.success) {
                setVendors(res.data.vendors);
            }
        } catch (error) {
            toast.error('Failed to fetch vendors');
        }
    };

    const handleOpenModal = (vendor = null) => {
        if (vendor) {
            setIsEditMode(true);
            setCurrentVendor({
                ...vendor,
                auto_assign: vendor.auto_assign === 1 || vendor.auto_assign === true
            });
        } else {
            setIsEditMode(false);
            setCurrentVendor({
                name: '',
                phone: '',
                service_category: '',
                address: '',
                auto_assign: true,
                status: 'Active'
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentVendor({
            name: '',
            phone: '',
            service_category: '',
            address: '',
            auto_assign: true,
            status: 'Active'
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditMode) {
                await axios.put(`${API_URL}/vendors/${currentVendor.id}`, currentVendor);
                toast.success('Vendor updated successfully');
            } else {
                await axios.post(`${API_URL}/vendors`, currentVendor);
                toast.success('Vendor added successfully');
            }
            fetchVendors();
            handleCloseModal();
        } catch (error) {
            toast.error('Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this vendor?')) {
            try {
                await axios.delete(`${API_URL}/vendors/${id}`);
                toast.success('Vendor deleted successfully');
                fetchVendors();
            } catch (error) {
                toast.error('Failed to delete vendor');
            }
        }
    };

    const filteredVendors = vendors.filter(vendor => 
        (vendor.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vendor.phone || '').includes(searchTerm) ||
        (vendor.service_category || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <ToastContainer position="top-right" />
            
            {/* Header */}
            <div className="page-header-container">
                <div className="page-title-group">
                    <h3><Store size={26} color="var(--primary)" /> Vendor Management</h3>
                    <p>Manage shop vendors, product categories, and automated order assignment.</p>
                </div>
                
                <button 
                    onClick={() => handleOpenModal()}
                    className="btn btn-primary"
                >
                    <Plus size={18} />
                    Add Vendor
                </button>
            </div>

            {/* Main Table Card */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ position: 'relative', width: '280px' }}>
                        <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                        <input
                            type="text"
                            placeholder="Search vendors by name, phone, category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', paddingLeft: '2.4rem', paddingRight: '2rem' }}
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')} 
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <span className="badge task">{filteredVendors.length} Registered Vendors</span>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Store Name</th>
                            <th>Category</th>
                            <th>WhatsApp Number</th>
                            <th>Auto-Assign</th>
                            <th>Accepted Orders</th>
                            <th>Total Earnings</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredVendors.length > 0 ? (
                            filteredVendors.map(vendor => (
                                <tr key={vendor.id}>
                                    <td><strong>{vendor.name}</strong></td>
                                    <td>
                                        <span className="badge task">{vendor.service_category || 'General'}</span>
                                    </td>
                                    <td>{vendor.phone}</td>
                                    <td>
                                        <span className={`badge ${(vendor.auto_assign === 1 || vendor.auto_assign === true) ? 'active' : 'pending'}`}>
                                            {(vendor.auto_assign === 1 || vendor.auto_assign === true) ? 'ON ⚡' : 'OFF'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                        {vendor.accepted_orders || 0}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                                        ₹{parseFloat(vendor.total_amount || 0).toFixed(2)}
                                    </td>
                                    <td>
                                        <span className={`badge ${vendor.status === 'Active' ? 'active' : 'danger'}`}>
                                            {vendor.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button 
                                                onClick={() => handleOpenModal(vendor)} 
                                                className="btn btn-outline"
                                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                                                title="Edit Vendor"
                                            >
                                                <Edit2 size={14} /> Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(vendor.id)} 
                                                className="btn"
                                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#ffe4e6', color: '#dc2626', border: '1px solid #fda4af' }}
                                                title="Delete Vendor"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                                    No vendors found. Click <strong>"Add Vendor"</strong> above to register a new vendor.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Vendor Form Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-card animate-fade">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{isEditMode ? 'Edit Vendor Details' : 'Add New Vendor'}</h3>
                            <button 
                                onClick={handleCloseModal} 
                                className="btn btn-outline"
                                style={{ padding: '0.2rem 0.55rem', fontSize: '0.85rem' }}
                            >
                                ✕
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Store / Vendor Name</label>
                                <input 
                                    type="text" 
                                    required
                                    style={{ width: '100%' }}
                                    value={currentVendor.name}
                                    onChange={(e) => setCurrentVendor({...currentVendor, name: e.target.value})}
                                    placeholder="e.g. Sathi Kiranam Store"
                                />
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>WhatsApp Number (with country code)</label>
                                <input 
                                    type="text" 
                                    required
                                    style={{ width: '100%' }}
                                    value={currentVendor.phone}
                                    onChange={(e) => setCurrentVendor({...currentVendor, phone: e.target.value})}
                                    placeholder="e.g. 919876543210"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Service Category</label>
                                <select 
                                    style={{ width: '100%' }}
                                    value={currentVendor.service_category}
                                    onChange={(e) => setCurrentVendor({...currentVendor, service_category: e.target.value})}
                                    required
                                >
                                    <option value="">Select a category</option>
                                    <option value="Groceries">Groceries</option>
                                    <option value="Vegetables & Fruits">Vegetables & Fruits</option>
                                    <option value="Home Services">Home Services</option>
                                    <option value="Food Service">Food Service</option>
                                    <option value="Medicines">Medicines</option>
                                    <option value="AnyWork">AnyWork</option>
                                    <option value="Ride">Ride</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Address (Optional)</label>
                                <textarea 
                                    style={{ width: '100%', minHeight: '60px', fontFamily: 'inherit' }}
                                    value={currentVendor.address || ''}
                                    onChange={(e) => setCurrentVendor({...currentVendor, address: e.target.value})}
                                    placeholder="Shop address..."
                                    rows="2"
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Latitude</label>
                                    <input 
                                        type="number" 
                                        step="any"
                                        style={{ width: '100%' }}
                                        value={currentVendor.lat || ''}
                                        onChange={(e) => setCurrentVendor({...currentVendor, lat: e.target.value})}
                                        placeholder="17.3850"
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Longitude</label>
                                    <input 
                                        type="number" 
                                        step="any"
                                        style={{ width: '100%' }}
                                        value={currentVendor.lng || ''}
                                        onChange={(e) => setCurrentVendor({...currentVendor, lng: e.target.value})}
                                        placeholder="78.4867"
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                                <input 
                                    type="checkbox"
                                    id="auto_assign_cb"
                                    checked={currentVendor.auto_assign}
                                    onChange={(e) => setCurrentVendor({...currentVendor, auto_assign: e.target.checked})}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <label htmlFor="auto_assign_cb" style={{ fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                                    <strong>Auto-Assign Orders</strong>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automatically route new customer orders in this category to this vendor.</div>
                                </label>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status</label>
                                <select 
                                    style={{ width: '100%' }}
                                    value={currentVendor.status}
                                    onChange={(e) => setCurrentVendor({...currentVendor, status: e.target.value})}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                <button 
                                    type="button" 
                                    onClick={handleCloseModal}
                                    className="btn btn-outline"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary"
                                >
                                    {isEditMode ? 'Update Vendor' : 'Save Vendor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
