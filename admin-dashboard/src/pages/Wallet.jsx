import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Wallet, Search, CreditCard, History, X,
    ArrowUpRight, ArrowDownRight, Zap, Download, FileText,
    Users, TrendingUp, TrendingDown, RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { formatDateTimeIST } from '../utils/dateUtils';
import { API_URL } from '../config';

export default function WalletPage() {
    const [helpers, setHelpers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedHelper, setSelectedHelper] = useState(null);
    const [ledger, setLedger] = useState([]);

    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [rechargeDesc, setRechargeDesc] = useState('Manual Recharge via UPI');

    useEffect(() => { fetchHelpers(); }, []);

    const fetchHelpers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/wallet/helpers`);
            setHelpers(res.data.helpers || []);
        } catch {
            toast.error('Failed to fetch helper wallets');
        } finally {
            setLoading(false);
        }
    };

    const handleViewLedger = async (helper) => {
        setSelectedHelper(helper);
        try {
            const res = await axios.get(`${API_URL}/wallet/ledger/${helper.id}`);
            setLedger(res.data.ledger || []);
        } catch {
            toast.error('Failed to load ledger history');
        }
    };

    const handleRecharge = async (e) => {
        e.preventDefault();
        if (!selectedHelper || !rechargeAmount || rechargeAmount <= 0) return;
        try {
            await axios.post(`${API_URL}/wallet/recharge`, {
                helper_id: selectedHelper.id,
                amount: parseFloat(rechargeAmount),
                description: rechargeDesc,
            });
            toast.success('Wallet recharged successfully!');
            setIsRechargeModalOpen(false);
            setRechargeAmount('');
            fetchHelpers();
            handleViewLedger(selectedHelper);
        } catch {
            toast.error('Failed to recharge wallet');
        }
    };

    const handleExportAllTransactions = async () => {
        try {
            const res = await axios.get(`${API_URL}/wallet/ledger-all`);
            if (res.data.success) {
                const allLedger = res.data.ledger || [];
                const headers = ['Txn ID', 'Helper Name', 'Helper Code', 'Phone', 'Order ID', 'Service', 'Payment Method', 'Customer Paid (₹)', 'Helper Received (₹)', 'Admin Share (₹)', 'Wallet Impact (₹)', 'Type', 'Description', 'Date & Time'];
                const rows = allLedger.map(txn => [
                    txn.id, txn.helper_name, txn.helper_code, txn.helper_phone,
                    txn.display_order_id || txn.order_id || '-',
                    txn.service || '-', txn.payment_method || 'UPI',
                    txn.customer_paid || 0, txn.helper_received || 0,
                    txn.platform_fee || 0, txn.amount, txn.type,
                    txn.description || '-',
                    formatDateTimeIST(txn.created_at),
                ]);
                exportToExcel('Need2Done_All_Wallet_Transactions', headers, rows);
            }
        } catch {
            toast.error('Failed to export all transactions');
        }
    };

    const handleExportSelectedLedger = () => {
        if (!selectedHelper || !ledger.length) return toast.info('No transactions to export');
        const headers = ['Order ID', 'Service', 'Payment', 'Customer Paid (₹)', 'Helper Received (₹)', 'Admin Share (₹)', 'Wallet Impact (₹)', 'Type', 'Description', 'Date & Time'];
        const rows = ledger.map(txn => [
            txn.display_order_id || txn.order_id || '-',
            txn.service || '-', txn.payment_method || 'UPI',
            txn.customer_paid || 0, txn.helper_received || 0,
            txn.platform_fee || 0, txn.amount, txn.type,
            txn.description || '-',
            formatDateTimeIST(txn.created_at),
        ]);
        exportToExcel(`Need2Done_Wallet_Ledger_${selectedHelper.name}_${selectedHelper.helper_code}`, headers, rows);
    };

    const handleExportSelectedPDF = () => {
        if (!selectedHelper || !ledger.length) return toast.info('No transactions to export');
        const title = `Wallet Statement - ${selectedHelper.name} (${selectedHelper.helper_code})`;
        const dateRange = `Helper Phone: ${selectedHelper.phone} | Current Balance: ₹${parseFloat(selectedHelper.wallet_balance).toFixed(2)}`;
        const stats = [
            { title: 'Helper Name', value: selectedHelper.name, subtitle: `Code: ${selectedHelper.helper_code}` },
            { title: 'Wallet Balance', value: `₹${parseFloat(selectedHelper.wallet_balance).toFixed(2)}`, subtitle: `Status: ${selectedHelper.status}` },
            { title: 'Total Orders/Txns', value: ledger.length.toString(), subtitle: 'Ledger Records' },
        ];
        const headers = ['Date & Time', 'Order ID', 'Service', 'Mode', 'Cust Paid', 'Helper Recv', 'Admin Share', 'Wallet Impact'];
        const rows = ledger.map(txn => [
            formatDateTimeIST(txn.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            txn.display_order_id || '-', txn.service || '-', txn.payment_method || 'UPI',
            `₹${parseFloat(txn.customer_paid || 0).toFixed(2)}`,
            `₹${parseFloat(txn.helper_received || 0).toFixed(2)}`,
            `₹${parseFloat(txn.platform_fee || 0).toFixed(2)}`,
            `${txn.type === 'CREDIT' ? '+' : '-'}₹${parseFloat(txn.amount).toFixed(2)}`,
        ]);
        exportToPDF(title, dateRange, stats, headers, rows);
    };

    const filteredHelpers = helpers.filter(h =>
        h.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.phone?.includes(searchQuery) ||
        h.helper_code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Derived stats
    const totalBalance = helpers.reduce((s, h) => s + parseFloat(h.wallet_balance || 0), 0);
    const onlineCount  = helpers.filter(h => h.status === 'ONLINE').length;
    const txnTotal     = ledger.reduce((s, t) => s + parseFloat(t.customer_paid || 0), 0);

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0 }}>

            {/* ── Page Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Wallet size={24} color="#2563eb" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
                            Wallets &amp; Settlements
                        </h1>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                            Manage helper balances and live transaction ledgers
                        </p>
                    </div>
                </div>

                <button className="btn btn-export-excel" onClick={handleExportAllTransactions} title="Export ALL transactions">
                    <Download size={15} /> Excel (All Transactions)
                </button>
            </div>

            {/* ── Summary Stat Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                {[
                    { label: 'Total Helpers',   value: helpers.length,                          icon: Users,       color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
                    { label: 'Online Now',       value: onlineCount,                             icon: Zap,         color: '#059669', bg: 'rgba(5,150,105,0.08)' },
                    { label: 'Combined Balance', value: `₹${totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
                    { label: 'Txn Revenue',      value: selectedHelper ? `₹${txnTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—', icon: CreditCard, color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: '6px' }}>
                                    {label}
                                </p>
                                <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                                    {value}
                                </p>
                            </div>
                            <div className="stat-card-badge" style={{ backgroundColor: bg, color }}><Icon size={18} /></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Main Two-Column Panel ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '300px 1fr',
                gap: '16px',
                flex: 1,
                minHeight: 0,
                height: 'calc(100vh - 310px)',
            }}>

                {/* LEFT: Helper List */}
                <div style={{
                    background: '#fff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    minHeight: 0,
                }}>
                    {/* Search */}
                    <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid #f1f5f9', position: 'relative', flexShrink: 0 }}>
                        <Search size={14} style={{ position: 'absolute', left: '26px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                        <input
                            type="search"
                            placeholder="Search name, phone, code…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '7px 10px 7px 32px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                background: '#f8fafc',
                                fontSize: '13px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit',
                            }}
                        />
                    </div>

                    {/* Helper list */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                        {loading ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                <RefreshCw size={24} style={{ marginBottom: 8 }} />
                                <div style={{ fontSize: '13px' }}>Loading helpers…</div>
                            </div>
                        ) : filteredHelpers.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                No helpers found.
                            </div>
                        ) : filteredHelpers.map(helper => {
                            const isSelected = selectedHelper?.id === helper.id;
                            const bal = parseFloat(helper.wallet_balance);
                            const balColor = isSelected ? '#fff' : bal < 0 ? '#ef4444' : bal > 0 ? '#059669' : '#0f172a';

                            return (
                                <div
                                    key={helper.id}
                                    onClick={() => handleViewLedger(helper)}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px 12px',
                                        borderRadius: '10px',
                                        marginBottom: '4px',
                                        cursor: 'pointer',
                                        background: isSelected ? '#2563eb' : '#fff',
                                        border: isSelected ? '2px solid #2563eb' : '2px solid transparent',
                                        transition: 'all 150ms ease',
                                        boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
                                    }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '14px', color: isSelected ? '#fff' : '#0f172a' }}>
                                                {helper.name}
                                            </span>
                                            <span style={{
                                                fontSize: '10px', fontWeight: 800, padding: '1px 6px',
                                                borderRadius: '4px',
                                                background: isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                                                color: isSelected ? '#fff' : '#64748b',
                                            }}>
                                                {helper.helper_code}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: isSelected ? 'rgba(255,255,255,0.75)' : '#64748b', marginTop: '2px' }}>
                                            {helper.phone}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: isSelected ? 'rgba(255,255,255,0.6)' : '#94a3b8', marginBottom: '2px' }}>
                                            Balance
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: '15px', color: balColor, fontVariantNumeric: 'tabular-nums' }}>
                                            ₹{bal.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: Ledger Panel */}
                <div style={{
                    background: '#fff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    minHeight: 0,
                }}>
                    {selectedHelper ? (
                        <>
                            {/* Ledger Header */}
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #f1f5f9',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '10px',
                                flexShrink: 0,
                                background: '#fafbfc',
                            }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                        {selectedHelper.name}&apos;s Ledger
                                    </h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                                        <span style={{
                                            background: '#f0fdf4', color: '#15803d',
                                            border: '1px solid #bbf7d0',
                                            padding: '2px 10px', borderRadius: '9999px',
                                            fontSize: '13px', fontWeight: 700,
                                        }}>
                                            Balance: ₹{parseFloat(selectedHelper.wallet_balance).toFixed(2)}
                                        </span>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px',
                                            background: selectedHelper.status === 'ONLINE' ? '#ecfdf5' : '#f1f5f9',
                                            color: selectedHelper.status === 'ONLINE' ? '#059669' : '#475569',
                                            border: `1px solid ${selectedHelper.status === 'ONLINE' ? '#a7f3d0' : '#e2e8f0'}`,
                                        }}>
                                            {selectedHelper.status}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <button className="btn btn-export-excel" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleExportSelectedLedger}>
                                        <Download size={13} /> Excel
                                    </button>
                                    <button className="btn btn-export-pdf" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleExportSelectedPDF}>
                                        <FileText size={13} /> PDF Statement
                                    </button>
                                    <button
                                        onClick={() => setIsRechargeModalOpen(true)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                            color: '#fff', border: 'none',
                                            padding: '8px 16px', borderRadius: '10px',
                                            fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                                        }}
                                    >
                                        <Zap size={14} fill="currentColor" /> Recharge
                                    </button>
                                </div>
                            </div>

                            {/* Ledger Table — scrollable */}
                            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'separate',
                                    borderSpacing: 0,
                                    display: 'table',
                                    minWidth: '700px',
                                }}>
                                    <thead>
                                        <tr>
                                            {[
                                                { label: 'Date & Time',      align: 'left'  },
                                                { label: 'Order & Service',  align: 'left'  },
                                                { label: 'Mode',             align: 'center'},
                                                { label: 'Customer Paid',    align: 'right' },
                                                { label: 'Helper Received',  align: 'right' },
                                                { label: 'Admin Share',      align: 'right' },
                                                { label: 'Wallet Impact',    align: 'right' },
                                            ].map(col => (
                                                <th key={col.label} style={{
                                                    textAlign: col.align,
                                                    padding: '10px 14px',
                                                    fontSize: '11px', fontWeight: 700,
                                                    textTransform: 'uppercase', letterSpacing: '0.06em',
                                                    color: '#64748b', background: '#f8fafc',
                                                    borderBottom: '1px solid #e2e8f0',
                                                    whiteSpace: 'nowrap',
                                                    position: 'sticky', top: 0,
                                                }}>
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledger.length > 0 ? ledger.map((txn, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {/* Date */}
                                                <td style={{ padding: '12px 14px', fontSize: '12.5px', color: '#475569', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                                    {formatDateTimeIST(txn.created_at, {
                                                        month: 'short', day: 'numeric',
                                                        hour: '2-digit', minute: '2-digit',
                                                    })}
                                                </td>

                                                {/* Order + Service */}
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                                                        {txn.display_order_id || (txn.order_id ? `#${txn.order_id}` : '—')}
                                                    </div>
                                                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                                        {txn.service || txn.description || '—'}
                                                    </div>
                                                </td>

                                                {/* Payment Mode badge */}
                                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                                    <span style={{
                                                        fontSize: '11px', fontWeight: 700, padding: '3px 9px',
                                                        borderRadius: '9999px',
                                                        background: txn.payment_method === 'COD' ? '#fffbeb' : '#eff6ff',
                                                        color: txn.payment_method === 'COD' ? '#b45309' : '#2563eb',
                                                        border: `1px solid ${txn.payment_method === 'COD' ? '#fde68a' : '#bfdbfe'}`,
                                                    }}>
                                                        {txn.payment_method || 'UPI'}
                                                    </span>
                                                </td>

                                                {/* Customer Paid */}
                                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, fontSize: '13.5px', color: '#0f172a', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                                    ₹{parseFloat(txn.customer_paid || 0).toFixed(2)}
                                                </td>

                                                {/* Helper Received */}
                                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, fontSize: '13.5px', color: '#059669', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                                    ₹{parseFloat(txn.helper_received || 0).toFixed(2)}
                                                </td>

                                                {/* Admin Share */}
                                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, fontSize: '13.5px', color: '#2563eb', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                                    ₹{parseFloat(txn.platform_fee || 0).toFixed(2)}
                                                </td>

                                                {/* Wallet Impact */}
                                                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                                    <div style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                        fontWeight: 800, fontSize: '14px',
                                                        color: txn.type === 'CREDIT' ? '#059669' : '#dc2626',
                                                        fontVariantNumeric: 'tabular-nums',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {txn.type === 'CREDIT'
                                                            ? <ArrowUpRight size={15} />
                                                            : <ArrowDownRight size={15} />
                                                        }
                                                        ₹{parseFloat(txn.amount).toFixed(2)}
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                                    <History size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>No transactions recorded yet.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        /* Empty state */
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center', padding: '40px' }}>
                            <div style={{ width: 80, height: 80, background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                                <Wallet size={40} color="#cbd5e1" strokeWidth={1.5} />
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Select a Helper</h3>
                            <p style={{ margin: 0, fontSize: '13px', maxWidth: '280px', lineHeight: 1.6 }}>
                                Choose a helper from the list to view their transaction ledger and process recharges.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Recharge Modal ── */}
            {isRechargeModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(15,23,42,0.45)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '16px',
                }}>
                    <div style={{
                        background: '#fff', width: '100%', maxWidth: '420px',
                        borderRadius: '20px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)',
                        overflow: 'hidden',
                        animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}>
                        {/* Modal header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Recharge Wallet</h2>
                                <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>For {selectedHelper?.name}</p>
                            </div>
                            <button onClick={() => setIsRechargeModalOpen(false)} style={{
                                background: '#f1f5f9', border: 'none', width: 34, height: 34,
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: '#64748b',
                            }}>
                                <X size={17} />
                            </button>
                        </div>

                        <form onSubmit={handleRecharge} style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '18px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '8px' }}>
                                    Amount (₹)
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', fontWeight: 800, color: '#94a3b8' }}>₹</span>
                                    <input
                                        type="number" required min="1"
                                        value={rechargeAmount}
                                        onChange={e => setRechargeAmount(e.target.value)}
                                        placeholder="0.00"
                                        style={{ width: '100%', padding: '14px 14px 14px 36px', fontSize: '22px', fontWeight: 800, border: '2px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: '8px' }}>
                                    Description / Reference
                                </label>
                                <input
                                    type="text" required
                                    value={rechargeDesc}
                                    onChange={e => setRechargeDesc(e.target.value)}
                                    style={{ width: '100%', padding: '12px 14px', fontSize: '14px', fontWeight: 600, border: '2px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setIsRechargeModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
                                    <Zap size={16} fill="currentColor" /> Process
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes modalSlideIn {
                    from { transform: translateY(16px) scale(0.97); opacity: 0; }
                    to   { transform: translateY(0) scale(1); opacity: 1; }
                }
                @media (max-width: 900px) {
                    .wallet-two-col { grid-template-columns: 1fr !important; height: auto !important; }
                }
            `}</style>
        </div>
    );
}
