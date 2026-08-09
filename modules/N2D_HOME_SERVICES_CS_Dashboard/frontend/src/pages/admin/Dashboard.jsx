import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { FaTrash, FaEdit, FaPlus, FaSignOutAlt, FaUpload } from 'react-icons/fa';

const Dashboard = () => {
  const { services, addService, updateService, deleteService, platformFee, setPlatformFee, isAdminAuth, setIsAdminAuth } = useContext(DataContext);
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [duration, setDuration] = useState('');
  const [image, setImage] = useState('');
  const [feeInput, setFeeInput] = useState(platformFee);

  useEffect(() => {
    if (!isAdminAuth) {
      navigate('/admin/login');
    }
  }, [isAdminAuth, navigate]);

  const handleLogout = () => {
    setIsAdminAuth(false);
    navigate('/admin/login');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result); // Base64 string
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveFee = () => {
    setPlatformFee(parseFloat(feeInput) || 0);
    alert('Platform fee updated successfully!');
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setBasePrice('');
    setDuration('');
    setImage('');
    setCurrentService(null);
    setIsEditing(false);
  };

  const handleEditClick = (service) => {
    setName(service.name);
    setDescription(service.description);
    setBasePrice(service.base_price);
    setDuration(service.duration);
    setImage(service.image);
    setCurrentService(service);
    setIsEditing(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const serviceData = {
      name,
      description,
      base_price: parseFloat(basePrice) || 0,
      duration,
      image: image || `${import.meta.env.BASE_URL}images/dishwashing.png` // fallback
    };

    if (currentService) {
      updateService(currentService.id, serviceData);
    } else {
      addService(serviceData);
    }
    resetForm();
  };

  if (!isAdminAuth) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h1 className="text-3xl font-black text-gray-900">Admin Dashboard</h1>
          <div className="flex flex-wrap gap-3 items-center">
            <button 
              onClick={() => {
                if(window.confirm('This will delete all custom services and restore the original generated images. Continue?')) {
                  localStorage.removeItem('n2d_services');
                  window.location.reload();
                }
              }} 
              className="flex items-center text-gray-600 font-bold hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors border border-gray-200"
            >
              Reset Images
            </button>
            <button onClick={handleLogout} className="flex items-center text-red-600 font-bold hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
              <FaSignOutAlt className="mr-2" /> Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Form & Settings */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Settings Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Platform Settings</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform Fee (₹)</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={feeInput} 
                    onChange={(e) => setFeeInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button onClick={handleSaveFee} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">
                    Save
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">This fee is added to every booking automatically.</p>
              </div>
            </div>

            {/* Service Form Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Service' : 'Add New Service'}</h2>
                {isEditing && (
                  <button onClick={resetForm} className="text-sm text-gray-500 hover:text-gray-700 font-medium">Cancel Edit</button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (₹)</label>
                    <input type="number" required value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <input type="text" placeholder="e.g. 1 Hour" required value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows="3" required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Image</label>
                  <div className="mt-1 flex items-center gap-4">
                    {image && <img src={image} alt="Preview" className="h-16 w-16 object-cover rounded-lg border" />}
                    <label className="cursor-pointer bg-gray-50 px-4 py-2 border border-gray-300 rounded-lg flex items-center text-sm font-medium text-gray-700 hover:bg-gray-100">
                      <FaUpload className="mr-2" /> Upload Image
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>

                <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg shadow-md transition-colors mt-4">
                  {isEditing ? 'Update Service' : 'Add Service'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Services List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Manage Services</h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{services.length} Total</span>
              </div>
              <ul className="divide-y divide-gray-200">
                {services.map((service) => (
                  <li key={service.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={service.image} alt={service.name} className="h-16 w-16 rounded-xl object-cover shadow-sm" />
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-500">{service.duration} • ₹{service.base_price}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditClick(service)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <FaEdit size={20} />
                      </button>
                      <button onClick={() => deleteService(service.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <FaTrash size={20} />
                      </button>
                    </div>
                  </li>
                ))}
                {services.length === 0 && (
                  <div className="p-8 text-center text-gray-500">No services found. Add one!</div>
                )}
              </ul>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
