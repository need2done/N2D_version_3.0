import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, Search, CreditCard, History, X, ArrowUpRight, ArrowDownRight, Zap, Download, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function WalletPage() {
    const [helpers, setHelpers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedHelper, setSelectedHelper] = useState(null);
    const [ledger, setLedger] = useState([]);
    
    // Recharge Modal State
    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [rechargeDesc, setRechargeDesc] = useState('Manual Recharge via UPI');

    useEffect(() => {
        fetchHelpers();
    }, []);

    const fetchHelpers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/wallet/helpers`);
            setHelpers(res.data.helpers || []);
        } catch (err) {
            toast.error("Failed to fetch helper wallets");
        } finally {
            setLoading(false);
        }
    };

    const handleViewLedger = async (helper) => {
        setSelectedHelper(helper);
        try {
            const res = await axios.get(`${API_URL}/wallet/ledger/${helper.id}`);
            setLedger(res.data.ledger || []);
        } catch (err) {
            toast.error("Failed to load ledger history");
        }
    };

    const handleRecharge = async (e) => {
        e.preventDefault();
        if (!selectedHelper || !rechargeAmount || rechargeAmount <= 0) return;

        try {
            await axios.post(`${API_URL}/wallet/recharge`, {
                helper_id: selectedHelper.id,
                amount: parseFloat(rechargeAmount),
                description: rechargeDesc
            });
            toast.success("Wallet recharged successfully! ⚡");
            setIsRechargeModalOpen(false);
            setRechargeAmount('');
            
            // Refresh
            fetchHelpers();
            handleViewLedger(selectedHelper);
        } catch (err) {
            toast.error("Failed to recharge wallet");
        }
    };

    // Export all ledger transactions for all helpers
    const handleExportAllTransactions = async () => {
        try {
            const res = await axios.get(`${API_URL}/wallet/ledger-all`);
            if (res.data.success) {
                const allLedger = res.data.ledger || [];
                const headers = ['Transaction ID', 'Helper Name', 'Helper Code', 'Phone', 'Type', 'Amount (₹)', 'Description', 'Reference ID', 'Date & Time'];
                const rows = allLedger.map(txn => [
                    txn.id,
                    txn.helper_name,
                    txn.helper_code,
                    txn.helper_phone,
                    txn.type,
                    txn.amount,
                    txn.description || '-',
                    txn.reference_id || '-',
                    new Date(txn.created_at).toLocaleString()
                ]);
                exportToExcel('Need2Done_All_Wallet_Transactions', headers, rows);
            }
        } catch (err) {
            toast.error('Failed to export all transactions');
        }
    };

    // Export selected helper transactions
    const handleExportSelectedLedger = () => {
        if (!selectedHelper || !ledger.length) return toast.info('No transactions to export for this helper');
        const headers = ['Transaction ID', 'Type', 'Amount (₹)', 'Description', 'Reference ID', 'Date & Time'];
        const rows = ledger.map(txn => [
            txn.id,
            txn.type,
            txn.amount,
            txn.description || '-',
            txn.reference_id || '-',
            new Date(txn.created_at).toLocaleString()
        ]);
        exportToExcel(`Need2Done_Wallet_Ledger_${selectedHelper.name}_${selectedHelper.helper_code}`, headers, rows);
    };

    // Export PDF report for selected helper
    const handleExportSelectedPDF = () => {
        if (!selectedHelper || !ledger.length) return toast.info('No transactions to export for this helper');
        const title = `Wallet Statement - ${selectedHelper.name} (${selectedHelper.helper_code})`;
        const dateRange = `Helper Phone: ${selectedHelper.phone} | Current Balance: ₹${parseFloat(selectedHelper.wallet_balance).toFixed(2)}`;
        const stats = [
            { title: 'Helper Name', value: selectedHelper.name, subtitle: `Code: ${selectedHelper.helper_code}` },
            { title: 'Wallet Balance', value: `₹${parseFloat(selectedHelper.wallet_balance).toFixed(2)}`, subtitle: `Status: ${selectedHelper.status}` },
            { title: 'Total Transactions', value: ledger.length.toString(), subtitle: 'Ledger Records' }
        ];
        const headers = ['Date & Time', 'Type', 'Description', 'Reference ID', 'Amount'];
        const rows = ledger.map(txn => [
            new Date(txn.created_at).toLocaleString(),
            txn.type,
            txn.description || '-',
            txn.reference_id || '-',
            `₹${parseFloat(txn.amount).toFixed(2)}`
        ]);
        exportToPDF(title, dateRange, stats, headers, rows);
    };

    const filteredHelpers = helpers.filter(h => 
        h.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        h.phone?.includes(searchQuery) ||
        h.helper_code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="wallet-page-container">
            <div className="wallet-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="wallet-title-container">
                    <Wallet className="wallet-icon" size={36} strokeWidth={2.5} />
                    <div>
                        <h1 className="wallet-title">Wallets & Settlements</h1>
                        <p className="wallet-subtitle">Manage balances and live transaction ledgers with ease.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className="btn btn-export-excel" onClick={handleExportAllTransactions} title="Export ALL transactions across all helpers to Excel">
                        <Download size={16} /> Excel (All Transactions)
                    </button>
                </div>
            </div>

            <div className="wallet-grid">
                
                {/* LEFT COLUMN: Helper List */}
                <div className="wallet-list-panel glass-panel">
                    <div className="wallet-search-box" style={{ position: 'relative' }}>
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Search by Name, Phone, or Code..."
                            className="wallet-search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingRight: '2rem' }}
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    
                    <div className="wallet-list custom-scrollbar">
                        {loading ? (
                            <div className="empty-state">
                                <Zap className="pulse-icon" size={28} />
                                <span>Loading helpers...</span>
                            </div>
                        ) : filteredHelpers.length === 0 ? (
                            <div className="empty-state">
                                <Search className="opacity-20 mb-3" size={40} />
                                <span>{searchQuery ? "No matching helpers found." : "No helpers available."}</span>
                            </div>
                        ) : filteredHelpers.map(helper => {
                            const isSelected = selectedHelper?.id === helper.id;
                            const isNegative = helper.wallet_balance < 0;
                            const isPositive = helper.wallet_balance > 0;
                            
                            return (
                                <div 
                                    key={helper.id}
                                    onClick={() => handleViewLedger(helper)}
                                    className={`helper-card ${isSelected ? 'selected' : ''}`}
                                >
                                    <div className="helper-info">
                                        <div className="helper-name-row">
                                            <span className="helper-name">{helper.name}</span>
                                            <span className="helper-code-badge">{helper.helper_code}</span>
                                        </div>
                                        <div className="helper-phone">{helper.phone}</div>
                                    </div>
                                    <div className="helper-balance-col">
                                        <div className="balance-label">Balance</div>
                                        <div className={`helper-balance ${isSelected ? 'text-white' : (isNegative ? 'text-danger' : isPositive ? 'text-success' : '')}`}>
                                            ₹{parseFloat(helper.wallet_balance).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT COLUMN: Ledger & Actions */}
                <div className="wallet-ledger-panel glass-panel">
                    {selectedHelper ? (
                        <>
                            <div className="ledger-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div>
                                    <h2 className="ledger-title">{selectedHelper.name}'s Ledger</h2>
                                    <div className="ledger-badges">
                                        <p className="balance-badge">
                                            Current Balance:{' '}
                                            <span className={`balance-amount ${selectedHelper.wallet_balance < 0 ? 'text-danger' : 'text-success'}`}>
                                                ₹{parseFloat(selectedHelper.wallet_balance).toFixed(2)}
                                            </span>
                                        </p>
                                        <span className={`status-badge ${selectedHelper.status === 'ONLINE' ? 'online' : 'offline'}`}>
                                            {selectedHelper.status}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <button className="btn btn-export-excel" onClick={handleExportSelectedLedger} style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem' }} title="Export selected helper ledger to Excel">
                                        <Download size={14} /> Excel
                                    </button>
                                    <button className="btn btn-export-pdf" onClick={handleExportSelectedPDF} style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem' }} title="Export printable wallet PDF statement">
                                        <FileText size={14} /> PDF Statement
                                    </button>
                                    <button 
                                        onClick={() => setIsRechargeModalOpen(true)}
                                        className="recharge-btn"
                                    >
                                        <Zap size={18} fill="currentColor" />
                                        Recharge
                                    </button>
                                </div>
                            </div>
                            
                            <div className="ledger-body custom-scrollbar">
                                <div className="ledger-table-container">
                                    <table className="ledger-table">
                                        <thead>
                                            <tr>
                                                <th>Date & Time</th>
                                                <th>Transaction Details</th>
                                                <th>Reference</th>
                                                <th className="text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ledger.length > 0 ? ledger.map((txn, idx) => (
                                                <tr key={idx} className="ledger-row">
                                                    <td className="time-col">
                                                        {new Date(txn.created_at).toLocaleString(undefined, {
                                                            month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
                                                        })}
                                                    </td>
                                                    <td>
                                                        <div className="txn-desc">{txn.description}</div>
                                                        <div className="txn-type">{txn.type}</div>
                                                    </td>
                                                    <td>
                                                        {txn.order_id ? (
                                                            <span className="order-badge">
                                                                #{txn.order_id}
                                                            </span>
                                                        ) : (
                                                            <span className="no-order">-</span>
                                                        )}
                                                    </td>
                                                    <td className="text-right">
                                                        <div className={`txn-amount ${txn.type === 'CREDIT' ? 'text-success' : 'text-danger'}`}>
                                                            {txn.type === 'CREDIT' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                                            ₹{parseFloat(txn.amount).toFixed(2)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="4" className="empty-ledger">
                                                        <History className="opacity-20 mb-4 mx-auto" size={48} />
                                                        <p>No transactions recorded yet.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="unselected-state">
                            <div className="unselected-icon-box">
                                <Wallet size={56} className="unselected-icon" strokeWidth={1.5} />
                            </div>
                            <h3>Select a Helper</h3>
                            <p>Choose a helper from the list to view their detailed transaction ledger and process recharges.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recharge Modal */}
            {isRechargeModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass-modal">
                        <div className="modal-header">
                            <div>
                                <h2>Recharge Wallet</h2>
                                <p>For {selectedHelper?.name}</p>
                            </div>
                            <button onClick={() => setIsRechargeModalOpen(false)} className="close-btn">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleRecharge} className="modal-body">
                            <div className="form-group">
                                <label>Amount (₹)</label>
                                <div className="input-with-icon">
                                    <span className="currency-symbol">₹</span>
                                    <input 
                                        type="number" 
                                        required
                                        min="1"
                                        className="amount-input"
                                        value={rechargeAmount}
                                        onChange={(e) => setRechargeAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description / Reference</label>
                                <input 
                                    type="text" 
                                    required
                                    className="desc-input"
                                    value={rechargeDesc}
                                    onChange={(e) => setRechargeDesc(e.target.value)}
                                />
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setIsRechargeModalOpen(false)} className="cancel-btn">
                                    Cancel
                                </button>
                                <button type="submit" className="process-btn">
                                    <Zap size={18} fill="currentColor" />
                                    Process
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <style>{`
                .wallet-page-container {
                    padding: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                    font-family: 'Inter', sans-serif;
                }
                .wallet-header {
                    margin-bottom: 2rem;
                }
                .wallet-title-container {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .wallet-icon {
                    color: var(--primary);
                    background: #eff6ff;
                    padding: 0.5rem;
                    border-radius: 12px;
                    width: 50px;
                    height: 50px;
                }
                .wallet-title {
                    font-size: 2rem;
                    font-weight: 800;
                    margin: 0;
                    color: var(--text-main);
                    letter-spacing: -0.5px;
                }
                .wallet-subtitle {
                    color: var(--text-muted);
                    margin: 0.25rem 0 0 0;
                    font-size: 1.05rem;
                }
                
                .wallet-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                    height: calc(100vh - 160px);
                }
                @media (min-width: 1024px) {
                    .wallet-grid {
                        grid-template-columns: 350px 1fr;
                    }
                }
                
                .glass-panel {
                    background: #ffffff;
                    border-radius: 20px;
                    box-shadow: 0 10px 30px -5px rgba(0,0,0,0.05);
                    border: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                
                .wallet-search-box {
                    padding: 1.25rem;
                    border-bottom: 1px solid var(--border);
                    position: relative;
                }
                .search-icon {
                    position: absolute;
                    left: 2rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                }
                .wallet-search-input {
                    width: 100%;
                    padding: 0.75rem 1rem 0.75rem 2.5rem;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    background: #f8fafc;
                    transition: all 0.2s;
                    box-sizing: border-box;
                    font-size: 0.95rem;
                }
                .wallet-search-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    background: #fff;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                }
                
                .wallet-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0.75rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .helper-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    border-radius: 14px;
                    cursor: pointer;
                    border: 2px solid transparent;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    background: #fff;
                }
                .helper-card:hover {
                    background: #f8fafc;
                    border-color: #e2e8f0;
                    transform: translateY(-1px);
                }
                .helper-card.selected {
                    background: linear-gradient(135deg, var(--primary) 0%, #2563eb 100%);
                    box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.4);
                    color: #fff;
                }
                
                .helper-name-row {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .helper-name {
                    font-weight: 700;
                    font-size: 1.05rem;
                    color: var(--text-main);
                }
                .helper-card.selected .helper-name {
                    color: #fff;
                }
                .helper-code-badge {
                    font-size: 0.65rem;
                    font-weight: 800;
                    background: #f1f5f9;
                    color: #64748b;
                    padding: 0.1rem 0.4rem;
                    border-radius: 4px;
                }
                .helper-card.selected .helper-code-badge {
                    background: rgba(255,255,255,0.2);
                    color: #fff;
                }
                .helper-phone {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    margin-top: 0.25rem;
                }
                .helper-card.selected .helper-phone {
                    color: rgba(255,255,255,0.8);
                }
                
                .helper-balance-col {
                    text-align: right;
                }
                .balance-label {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    font-weight: 700;
                    color: #94a3b8;
                    margin-bottom: 0.1rem;
                }
                .helper-card.selected .balance-label {
                    color: rgba(255,255,255,0.6);
                }
                .helper-balance {
                    font-weight: 800;
                    font-size: 1.1rem;
                    color: var(--text-main);
                }
                
                .text-danger { color: #ef4444 !important; }
                .text-success { color: #10b981 !important; }
                .text-white { color: #fff !important; }
                
                .ledger-header {
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #fafaf9;
                }
                .ledger-title {
                    margin: 0 0 0.5rem 0;
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--text-main);
                }
                .ledger-badges {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .balance-badge {
                    margin: 0;
                    background: #fff;
                    border: 1px solid var(--border);
                    padding: 0.35rem 0.75rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-muted);
                }
                .balance-amount {
                    font-weight: 800;
                    font-size: 1.05rem;
                }
                .status-badge {
                    font-size: 0.75rem;
                    font-weight: 800;
                    padding: 0.25rem 0.65rem;
                    border-radius: 9999px;
                }
                .status-badge.online { background: #d1fae5; color: #047857; }
                .status-badge.offline { background: #f1f5f9; color: #475569; }
                
                .recharge-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: linear-gradient(135deg, var(--primary) 0%, #2563eb 100%);
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }
                .recharge-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
                }
                
                .ledger-body {
                    flex: 1;
                    padding: 1.5rem;
                    overflow-y: auto;
                    background: #fff;
                }
                .ledger-table-container {
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    overflow: hidden;
                }
                .ledger-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .ledger-table th {
                    background: #f8fafc;
                    padding: 1rem 1.25rem;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #64748b;
                    font-weight: 800;
                    border-bottom: 1px solid var(--border);
                    text-align: left;
                }
                .ledger-table td {
                    padding: 1rem 1.25rem;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }
                .ledger-row:hover {
                    background: #f8fafc;
                }
                .ledger-row:last-child td {
                    border-bottom: none;
                }
                .time-col {
                    color: #64748b;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                .txn-desc {
                    font-weight: 700;
                    color: var(--text-main);
                }
                .txn-type {
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: #94a3b8;
                    margin-top: 0.25rem;
                }
                .order-badge {
                    background: #eff6ff;
                    color: var(--primary);
                    border: 1px solid #bfdbfe;
                    padding: 0.2rem 0.5rem;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: 700;
                }
                .no-order {
                    color: #cbd5e1;
                }
                .txn-amount {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-weight: 900;
                    font-size: 1.1rem;
                }
                .text-right {
                    text-align: right;
                }
                
                .unselected-state, .empty-state {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #94a3b8;
                    text-align: center;
                    padding: 2rem;
                }
                .unselected-icon-box {
                    background: #f8fafc;
                    padding: 1.5rem;
                    border-radius: 50%;
                    margin-bottom: 1.5rem;
                }
                .unselected-icon {
                    color: #94a3b8;
                }
                .unselected-state h3 {
                    font-size: 1.5rem;
                    color: var(--text-main);
                    margin: 0 0 0.5rem 0;
                }
                
                .empty-ledger {
                    padding: 4rem 2rem !important;
                    text-align: center;
                    color: #94a3b8;
                    font-weight: 600;
                }
                
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1rem;
                }
                .modal-content {
                    background: #fff;
                    width: 100%;
                    max-width: 450px;
                    border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    overflow: hidden;
                    animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes modalSlideIn {
                    from { transform: translateY(20px) scale(0.95); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                .modal-header {
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8fafc;
                }
                .modal-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 800;
                }
                .modal-header p {
                    margin: 0.25rem 0 0 0;
                    color: var(--text-muted);
                    font-weight: 600;
                }
                .close-btn {
                    background: #fff;
                    border: 1px solid var(--border);
                    width: 36px; height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #94a3b8;
                    transition: all 0.2s;
                }
                .close-btn:hover {
                    background: #fee2e2;
                    color: #ef4444;
                    border-color: #fca5a5;
                }
                
                .modal-body {
                    padding: 2rem;
                }
                .form-group {
                    margin-bottom: 1.5rem;
                }
                .form-group label {
                    display: block;
                    font-size: 0.8rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #64748b;
                    margin-bottom: 0.5rem;
                }
                .input-with-icon {
                    position: relative;
                }
                .currency-symbol {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: #94a3b8;
                }
                .amount-input {
                    width: 100%;
                    padding: 1rem 1rem 1rem 2.5rem;
                    font-size: 1.5rem;
                    font-weight: 800;
                    border: 2px solid var(--border);
                    border-radius: 12px;
                    background: #f8fafc;
                    transition: all 0.2s;
                    box-sizing: border-box;
                }
                .desc-input {
                    width: 100%;
                    padding: 1rem;
                    font-size: 1rem;
                    font-weight: 600;
                    border: 2px solid var(--border);
                    border-radius: 12px;
                    background: #f8fafc;
                    transition: all 0.2s;
                    box-sizing: border-box;
                }
                .amount-input:focus, .desc-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    background: #fff;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                }
                
                .modal-footer {
                    display: flex;
                    gap: 1rem;
                    margin-top: 2rem;
                }
                .cancel-btn {
                    flex: 1;
                    padding: 1rem;
                    background: #f1f5f9;
                    color: #475569;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .cancel-btn:hover { background: #e2e8f0; }
                .process-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 1rem;
                    background: linear-gradient(135deg, var(--primary) 0%, #2563eb 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }
                .process-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
                }
                
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
            `}</style>
        </div>
    );
}
